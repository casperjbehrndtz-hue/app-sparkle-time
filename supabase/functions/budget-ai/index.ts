import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, validateMessages } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

// Transform Anthropic SSE → OpenAI-compatible SSE so the client (useAIStream.ts) needs no changes.
function anthropicToOpenAIStream(anthropicStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trimEnd();
        if (!trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
            const openAIChunk = JSON.stringify({ choices: [{ delta: { content: parsed.delta.text } }] });
            controller.enqueue(encoder.encode(`data: ${openAIChunk}\n\n`));
          }
        } catch { /* skip unparseable lines */ }
      }
    },
    flush(controller) {
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    },
  });

  return anthropicStream.pipeThrough(transform);
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";
    if (!await checkRateLimit("budget-ai", clientIP)) {
      return new Response(JSON.stringify({ error: "For mange forespørgsler. Prøv igen om lidt." }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { profile, budget, mode, messages: rawMessages, lang = "da" } = body;
    const chatMessages = validateMessages(rawMessages ?? []);
    const isNO = lang === "nb";
    const isEN = lang === "en";
    const replyLang = isNO ? "norsk bokmål" : isEN ? "English" : "dansk";
    const currency = lang === "en" ? "DKK" : "kr.";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // ─── Guided session mode (non-streaming JSON) ─────────────────────────
    if (mode === "guided-session") {
      const { goal_amount = 1000, rejected_fields = [], accepted_changes = [], found_total = 0 } = body;

      const streamingServices = [
        profile.hasNetflix && `Netflix (149 kr./md.)`,
        profile.hasSpotify && `Spotify (${profile.householdType === "par" ? 129 : 109} kr./md.)`,
        profile.hasHBO && `HBO Max (99 kr./md.)`,
        profile.hasViaplay && `Viaplay (99 kr./md.)`,
        profile.hasDisney && `Disney+ (99 kr./md.)`,
        profile.hasAppleTV && `Apple TV+ (59 kr./md.)`,
        profile.hasAmazonPrime && `Amazon Prime (89 kr./md.)`,
      ].filter(Boolean).join(", ") || "Ingen";

      const systemPrompt = `Du er Kassens AI-rådgiver i en guidet besparelses-session. Svar ALTID på ${replyLang}.
Brugerens mål: Find ${goal_amount} ${currency}/md. i besparelser.
Allerede fundet: ${found_total} ${currency}/md. ud af ${goal_amount} ${currency}/md.
${accepted_changes.length > 0 ? `Accepterede ændringer: ${(accepted_changes as any[]).map((c: any) => `${c.label} (+${c.monthly_saving} ${currency})`).join(", ")}` : ""}
${rejected_fields.length > 0 ? `Brugeren har sagt nej til disse — FORESLÅ IKKE IGEN: ${(rejected_fields as string[]).join(", ")}` : ""}

Brugerens profil:
Husstand: ${profile.householdType === "par" ? "Par" : "Enlig"}
Indkomst: ${budget.totalIncome} ${currency}/md. | Udgifter: ${budget.totalExpenses} ${currency}/md. | Rådighedsbeløb: ${budget.disposableIncome} ${currency}/md.
Streaming: ${streamingServices}
Mad: ${profile.foodAmount} ${currency}/md. | Restaurant: ${profile.restaurantAmount} ${currency}/md. | Fritid: ${profile.leisureAmount} ${currency}/md. | Tøj: ${profile.clothingAmount} ${currency}/md.
Fitness: ${profile.hasFitness ? `${profile.fitnessAmount} ${currency}/md.` : "Nej"} | Kæledyr: ${profile.hasPet ? `${profile.petAmount} ${currency}/md.` : "Nej"}
Lån: ${profile.hasLoan ? `${profile.loanAmount} ${currency}/md.` : "Nej"}

Returner KUN dette JSON (ingen markdown, ingen kodeblok):
{
  "message": "1-2 sætninger på ${replyLang}. Personlig og direkte. Forklar kort hvorfor dette giver mening for dem specifikt.",
  "suggestion": {
    "field": "PRÆCIST feltnavn fra profilen (fx hasViaplay, restaurantAmount)",
    "new_value": ny_værdi,
    "label": "Kort aktiv beskrivelse (fx 'Afmeld Viaplay')",
    "monthly_saving": præcis_kr_besparelse,
    "emoji": "ét relevant emoji"
  },
  "done": false
}

Regler:
- Ét forslag ad gangen — det med størst effekt der ikke er afvist
- Rækkefølge: streaming → restaurant/fritid → mad → tøj/sundhed → fitness/kæledyr
- For reducer-forslag (fx restaurantAmount): new_value = realistisk lavere beløb, monthly_saving = forskel
- Foreslå ALDRIG: forsikring, fagforening, bil, opsparing, bolig
- Feltnavne skal matche PRÆCIST: hasNetflix, hasSpotify, hasHBO, hasViaplay, hasDisney, hasAppleTV, hasAmazonPrime, hasFitness, hasPet, restaurantAmount, leisureAmount, foodAmount, clothingAmount, healthAmount
- Hvis found_total >= goal_amount ELLER ingen flere forslag: { "message": "...", "suggestion": null, "done": true }`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 350,
          system: systemPrompt,
          messages: [{ role: "user", content: "Hvad foreslår du?" }],
        }),
      });

      if (!res.ok) throw new Error(`Anthropic ${res.status}`);
      const data = await res.json();
      const text = data.content[0].text.trim();

      // Strip markdown code block if present
      const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(clean);

      return new Response(JSON.stringify(parsed), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const isPar = profile.householdType === "par";
    const profileSummary = `
Husstand: ${isPar ? "Par" : "Enlig"}
Indkomst: ${profile.income} kr./md.${isPar ? ` + partner: ${profile.partnerIncome} kr./md.` : ""}
Bolig: ${profile.housingType === "ejer" ? `Ejer, ydelse ${profile.mortgageAmount} kr./md.` : `Lejer, husleje ${profile.rentAmount} kr./md.`}
Postnummer: ${profile.postalCode}
Børn: ${profile.hasChildren ? profile.childrenAges.map((a: number) => `${a} år`).join(", ") : "Ingen"}
Bil: ${profile.hasCar ? `Ja, ${profile.carAmount} kr./md.` : "Nej"}
Forsikring: ${profile.hasInsurance ? `${profile.insuranceAmount} kr./md.` : "Nej"}
Fagforening: ${profile.hasUnion ? `${profile.unionAmount} kr./md.` : "Nej"}
Fitness: ${profile.hasFitness ? `${profile.fitnessAmount} kr./md.` : "Nej"}
Streaming: ${[profile.hasNetflix && "Netflix", profile.hasSpotify && "Spotify", profile.hasHBO && "HBO", profile.hasViaplay && "Viaplay", profile.hasDisney && "Disney+", profile.hasAppleTV && "Apple TV+", profile.hasAmazonPrime && "Amazon Prime"].filter(Boolean).join(", ") || "Ingen"}
Egne udgifter: ${profile.customExpenses?.length > 0 ? profile.customExpenses.map((e: any) => `${e.label}: ${e.amount} kr.`).join(", ") : "Ingen"}

Samlede udgifter: ${budget.totalExpenses} kr./md.
Rådighedsbeløb: ${budget.disposableIncome} kr./md.
`;

    const systemPrompt = mode === "optimize"
      ? `Du er Kassens AI-rådgiver – en varm, klog økonomisk ven.

REGLER:
- Svar ALTID på ${replyLang}
- Brug konkrete beløb
- Vær aldrig dømmende, altid konstruktiv
- Hold det kort og handlingsorienteret (max 250 ord)
- Brug emoji sparsomt men effektivt

Familiens profil:
${profileSummary}

Giv en personlig, prioriteret analyse med:
1. Den vigtigste indsigt om deres økonomi (1 sætning)
2. Top 3 konkrete handlinger med estimeret besparelse i ${currency}/md.
3. Én ting de gør godt
4. En opmuntrende afslutning

Format det pænt med overskrifter og bullet points i markdown.`
      : `Du er Kassens AI-rådgiver – en varm, klog økonomisk ven.

REGLER:
- Svar ALTID på ${replyLang}
- Brug konkrete beløb baseret på brugerens faktiske tal
- Vær aldrig dømmende
- Hold svar korte og præcise (max 150 ord)
- Referer til deres konkrete situation
- Brug markdown formatering

Familiens profil:
${profileSummary}

Besvar brugerens spørgsmål baseret på deres konkrete økonomi.`;

    // Build messages array for Anthropic (no system role in messages)
    const anthropicMessages: { role: string; content: string }[] = mode === "optimize"
      ? [{ role: "user", content: "Analysér min økonomi og giv mig personlige anbefalinger." }]
      : (chatMessages ?? []);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: mode === "optimize" ? 800 : 500,
        system: systemPrompt,
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørgsler. Prøv igen om lidt." }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (response.status === 529) {
        return new Response(JSON.stringify({ error: "AI er overbelastet. Prøv igen om lidt." }), {
          status: 503, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Anthropic error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-fejl. Prøv igen." }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(anthropicToOpenAIStream(response.body!), {
      headers: { ...cors, "Content-Type": "text/event-stream", "Vary": "Origin" },
    });
  } catch (e) {
    console.error("budget-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukendt fejl" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
