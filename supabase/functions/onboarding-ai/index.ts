import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
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
    if (!await checkRateLimit("onboarding-ai", clientIP)) {
      return new Response(JSON.stringify({ error: "For mange forespørgsler. Prøv igen om lidt." }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { mode, profile, step, budget, lang = "da" } = await req.json();
    const isNO = lang === "nb";
    const isEN = lang === "en";
    const replyLang = isNO ? "norsk bokmål" : isEN ? "English" : "dansk";
    const avgIncomeSolo = isNO ? "32 000" : "27.000";
    const avgIncomeCouple = isNO ? "62 000" : "52.000";
    const currency = isNO || lang === "da" ? "kr." : "DKK";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "live-comment") {
      const isPar = profile.householdType === "par";
      systemPrompt = `Du er en varm, klog økonomisk assistent i et budgetværktøj.
Brugeren er i gang med at udfylde deres budget og er på trin "${step}".

REGLER:
- Svar med ÉN kort, personlig kommentar (max 25 ord)
- Brug konkrete tal fra deres input
- Vær opmuntrende og konstruktiv, aldrig dømmende
- Sammenlign med lokale gennemsnit når relevant
- Brug emoji sparsomt (max 1)
- Svar ALTID på ${replyLang}
- Du yder IKKE finansiel rådgivning, kun analyse af tal`;

      const profileContext = JSON.stringify({
        householdType: profile.householdType,
        income: profile.income,
        partnerIncome: profile.partnerIncome,
        postalCode: profile.postalCode,
        housingType: profile.housingType,
        rentAmount: profile.rentAmount,
        mortgageAmount: profile.mortgageAmount,
        hasChildren: profile.hasChildren,
        childrenAges: profile.childrenAges,
        hasCar: profile.hasCar,
        hasInsurance: profile.hasInsurance,
        streamingCount: [profile.hasNetflix, profile.hasSpotify, profile.hasHBO, profile.hasViaplay, profile.hasDisney, profile.hasAppleTV, profile.hasAmazonPrime].filter(Boolean).length,
      });

      const stepContextMap: Record<string, string> = {
        income: `Brugerens indkomst: ${profile.income} ${currency}/md.${isPar ? ` Partner: ${profile.partnerIncome} ${currency}/md.` : ""}. Gennemsnit for ${isPar ? "par" : "enlige"}: ${isPar ? avgIncomeCouple : avgIncomeSolo} ${currency}/md.`,
        housing: `Boligtype: ${profile.housingType}, ${profile.housingType === "ejer" ? `ydelse: ${profile.mortgageAmount}` : `husleje: ${profile.rentAmount}`} kr./md. i postnr. ${profile.postalCode}. Anbefalet max 33% af indkomst.`,
        children: `Børn: ${profile.hasChildren ? `Ja, aldre: ${profile.childrenAges?.join(", ")}` : "Ingen"}`,
        expenses: `Valgte: ${[profile.hasCar && "bil", profile.hasInsurance && "forsikring", profile.hasUnion && "fagforening", profile.hasFitness && "fitness"].filter(Boolean).join(", ") || "ingen endnu"}. Streaming: ${[profile.hasNetflix, profile.hasSpotify, profile.hasHBO, profile.hasViaplay, profile.hasDisney, profile.hasAppleTV, profile.hasAmazonPrime].filter(Boolean).length} tjenester.`,
      };

      userPrompt = `Profil: ${profileContext}\n\nTrin: ${step}\nKontekst: ${stepContextMap[step] || "Bruger er startet"}`;

      // live-comment is non-streaming — return plain JSON
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 80,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited" }), {
            status: 429, headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Anthropic live-comment error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI error" }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const comment = data.content?.[0]?.text || "";
      return new Response(JSON.stringify({ comment }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });

    } else if (mode === "welcome-insight") {
      const isPar = profile.householdType === "par";
      systemPrompt = `Du er en klog, varm økonomisk analytiker i et budgetværktøj.
Brugeren har lige afsluttet onboarding og skal nu se deres personlige økonomiske profil for første gang.

REGLER:
- Skriv en KORT, engagerende analyse (max 80 ord)
- Start med den vigtigste indsigt om deres økonomi
- Nævn 1 styrke og 1 mulighed
- Brug konkrete beløb
- Afslut med en opmuntrende sætning
- Brug formatering: **fed** for nøgletal
- Svar ALTID på ${replyLang}
- Du yder IKKE finansiel rådgivning`;

      userPrompt = `Husstand: ${isPar ? "Par" : "Enlig"}
Indkomst: ${budget.totalIncome} ${currency}/md.
Udgifter: ${budget.totalExpenses} ${currency}/md.
Rådighedsbeløb: ${budget.disposableIncome} ${currency}/md.
Opsparingsrate: ${budget.disposableIncome > 0 ? Math.round((budget.disposableIncome / budget.totalIncome) * 100) : 0}%
Bolig: ${profile.housingType}, ${profile.housingType === "ejer" ? profile.mortgageAmount : profile.rentAmount} ${currency}/md.
Børn: ${profile.hasChildren ? profile.childrenAges.length : 0}
Streaming: ${[profile.hasNetflix, profile.hasSpotify, profile.hasHBO, profile.hasViaplay, profile.hasDisney, profile.hasAppleTV, profile.hasAmazonPrime].filter(Boolean).length}
Postnummer: ${profile.postalCode}
Land: ${isNO ? "Norge" : "Danmark"}

Giv en personlig, engagerende velkomst-analyse.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited" }), {
            status: 429, headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        if (response.status === 529) {
          return new Response(JSON.stringify({ error: "AI er overbelastet. Prøv igen om lidt." }), {
            status: 503, headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Anthropic welcome-insight error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI error" }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(anthropicToOpenAIStream(response.body!), {
        headers: { ...cors, "Content-Type": "text/event-stream" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Unknown mode" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("onboarding-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
