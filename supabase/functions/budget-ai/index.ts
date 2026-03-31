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

    // Hourly burst limit (20/hour)
    if (!await checkRateLimit("budget-ai", clientIP)) {
      return new Response(JSON.stringify({ error: "For mange forespørgsler. Prøv igen om lidt." }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Monthly freemium limit (15/month per IP — generous enough for real users, blocks abuse)
    const monthKey = `budget-ai-monthly:${new Date().toISOString().slice(0, 7)}`;
    if (!await checkRateLimit(monthKey, clientIP, 15)) {
      return new Response(JSON.stringify({ error: "Månedlig grænse nået. Prøv igen næste måned.", limit_reached: true }), {
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

      const systemPrompt = `Du er NemtBudgets AI-rådgiver i en guidet besparelses-session. Svar ALTID på ${replyLang}.

SESSION-STATUS:
- Mål: Find ${goal_amount} ${currency}/md. i besparelser
- Fundet indtil videre: ${found_total} ${currency}/md.
- Mangler: ${Math.max(0, goal_amount - found_total)} ${currency}/md.
${accepted_changes.length > 0 ? `- Accepteret: ${(accepted_changes as any[]).map((c: any) => `${c.label} (+${c.monthly_saving} ${currency})`).join(", ")}` : ""}
${rejected_fields.length > 0 ? `- Afvist (FORESLÅ IKKE IGEN): ${(rejected_fields as string[]).join(", ")}` : ""}

BRUGERENS ØKONOMI:
- Husstand: ${profile.householdType === "par" ? "Par" : "Enlig"}
- Indkomst: ${budget.totalIncome} ${currency}/md.
- Udgifter: ${budget.totalExpenses} ${currency}/md.
- Rådighedsbeløb (indkomst minus udgifter): ${budget.disposableIncome} ${currency}/md.
- Streaming: ${streamingServices}
- Mad: ${profile.foodAmount} ${currency}/md. | Restaurant: ${profile.restaurantAmount} ${currency}/md. | Fritid: ${profile.leisureAmount} ${currency}/md. | Tøj: ${profile.clothingAmount} ${currency}/md. | Sundhed: ${profile.healthAmount ?? 0} ${currency}/md.
- Fitness: ${profile.hasFitness ? `${profile.fitnessAmount} ${currency}/md.` : "Nej"} | Kæledyr: ${profile.hasPet ? `${profile.petAmount} ${currency}/md.` : "Nej"}
- Lån: ${profile.hasLoan ? `${profile.loanAmount} ${currency}/md.` : "Nej"}

VIGTIGE REGLER:
1. Ét forslag ad gangen — vælg det med STØRST reel effekt der ikke er afvist.
2. Spred forslagene over FORSKELLIGE kategorier. Foreslå MAX 1-2 streaming-afmeldinger per session — vælg de dyreste/mindst brugte. Gå derefter videre til andre kategorier. Folk vil beholde noget underholdning.
3. Prioritering: dyreste streaming → reducer restaurant/fritid → reducer mad → reducer tøj/sundhed → fitness/kæledyr. Spring kategorier med lave beløb over (< 200 kr.) — besparelsen er for lille til at mærke.
4. Foreslå REALISTISKE reduktioner, ikke eliminering. Fx reducer restaurant fra 800 til 500 (ikke 0). Reducer mad med max 15-20%. Folk skal stadig leve.
5. Foreslå ALDRIG ændringer til: forsikring, fagforening, bil, opsparing, bolig, lån — disse er enten nødvendige eller kræver ekspertrådgivning.
6. Alle beløb SKAL stemme overens med profilen ovenfor. Rådighedsbeløb = indkomst minus udgifter (brug det tal der står ovenfor, opfind ikke andre).
7. Hold en konsistent, professionel tone hele vejen. Vær direkte men aldrig panikagtig eller dømmende. Skriv som en økonomisk rådgiver — ikke en chatbot.

SVAR-FORMAT (KUN valid JSON, ingen markdown/kodeblok):
{
  "message": "1-2 sætninger på ${replyLang}. Personlig, direkte, og forklar kort HVORFOR dette forslag giver mening for netop denne bruger. Referer til deres konkrete tal.",
  "suggestion": {
    "field": "PRÆCIST feltnavn (hasNetflix, hasSpotify, hasHBO, hasViaplay, hasDisney, hasAppleTV, hasAmazonPrime, hasFitness, hasPet, restaurantAmount, leisureAmount, foodAmount, clothingAmount, healthAmount)",
    "new_value": ny_værdi,
    "label": "Kort aktiv beskrivelse (fx 'Afmeld Viaplay', 'Reducer restaurant')",
    "monthly_saving": præcis_kr_besparelse,
    "emoji": "ét relevant emoji"
  },
  "done": false
}

Hvis found_total >= goal_amount ELLER der ikke er flere realistiske forslag: { "message": "opsummering af hvad de har opnået", "suggestion": null, "done": true }`;

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
      ? `Du er NemtBudgets AI-rådgiver — klog, venlig og ærlig. Du taler som en kompetent ven der forstår privatøkonomi, ikke som en sælger eller en bekymret forælder.

REGLER:
- Svar ALTID på ${replyLang}
- Brug PRÆCIST brugerens tal fra profilen nedenfor — opfind aldrig beløb
- Vær konstruktiv og direkte, aldrig dømmende eller panikagtig
- Max 200 ord, ingen fyld
- Brug emoji kun som overskrifts-ikoner (max 3-4 i hele svaret)
- Alle besparelsesforslag skal være realistiske — folk skal stadig leve
- Nævn ALDRIG at brugeren bør skifte bolig, opsige forsikring, skifte fagforening eller sælge bil — det kræver ekspertrådgivning

Familiens profil:
${profileSummary}

Giv en personlig analyse med:
1. **Status**: Én klar sætning om deres økonomiske situation (brug det korrekte rådighedsbeløb fra profilen)
2. **Top 3 handlinger**: Konkrete, realistiske besparelser med estimeret beløb i ${currency}/md. Spred dem over forskellige kategorier.
3. **Det gør du godt**: Én ting de faktisk gør fornuftigt (fx sparer op, lav boligudgift, osv.)
4. **Næste skridt**: Én konkret handling de kan gøre i dag

Formatér med markdown overskrifter og bullet points.`
      : `Du er NemtBudgets AI-rådgiver — klog, venlig og ærlig. Du taler som en kompetent ven der forstår privatøkonomi.

REGLER:
- Svar ALTID på ${replyLang}
- Brug PRÆCIST brugerens tal fra profilen — opfind aldrig beløb
- Vær direkte og konkret, aldrig dømmende
- Max 120 ord — svar præcist på det der spørges om, ikke mere
- Brug markdown formatering
- Foreslå aldrig boligskift, forsikringsopsigelse eller bilsalg

Familiens profil:
${profileSummary}

Besvar brugerens spørgsmål baseret på deres konkrete økonomi. Giv ét klart svar, ikke en hel analyse.`;

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
