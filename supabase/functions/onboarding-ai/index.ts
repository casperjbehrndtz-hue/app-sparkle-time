import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─── Simple in-memory rate limiter: max 20 requests per IP per hour ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Clean up stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 10 * 60 * 1000);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ error: "For mange forespørgsler. Prøv igen om lidt." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mode, profile, step, budget } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "live-comment") {
      const isPar = profile.householdType === "par";
      systemPrompt = `Du er en varm, klog økonomisk assistent i et dansk budgetværktøj.
Brugeren er i gang med at udfylde deres budget og er på trin "${step}".

REGLER:
- Svar med ÉN kort, personlig kommentar (max 25 ord)
- Brug konkrete tal fra deres input
- Vær opmuntrende og konstruktiv, aldrig dømmende
- Sammenlign med danske gennemsnit når relevant
- Brug emoji sparsomt (max 1)
- Svar ALTID på dansk
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
        income: `Brugerens indkomst: ${profile.income} kr./md.${isPar ? ` Partner: ${profile.partnerIncome} kr./md.` : ""}. Gennemsnit for ${isPar ? "par" : "enlige"}: ${isPar ? "52.000" : "27.000"} kr./md.`,
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
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Anthropic live-comment error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const comment = data.content?.[0]?.text || "";
      return new Response(JSON.stringify({ comment }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (mode === "welcome-insight") {
      const isPar = profile.householdType === "par";
      systemPrompt = `Du er en klog, varm økonomisk analytiker i et dansk budgetværktøj.
Brugeren har lige afsluttet onboarding og skal nu se deres personlige økonomiske profil for første gang.

REGLER:
- Skriv en KORT, engagerende analyse (max 80 ord)
- Start med den vigtigste indsigt om deres økonomi
- Nævn 1 styrke og 1 mulighed
- Brug konkrete kronebeløb
- Afslut med en opmuntrende sætning
- Brug formatering: **fed** for nøgletal
- Svar ALTID på dansk
- Du yder IKKE finansiel rådgivning`;

      userPrompt = `Husstand: ${isPar ? "Par" : "Enlig"}
Indkomst: ${budget.totalIncome} kr./md.
Udgifter: ${budget.totalExpenses} kr./md.
Rådighedsbeløb: ${budget.disposableIncome} kr./md.
Opsparingsrate: ${budget.disposableIncome > 0 ? Math.round((budget.disposableIncome / budget.totalIncome) * 100) : 0}%
Bolig: ${profile.housingType}, ${profile.housingType === "ejer" ? profile.mortgageAmount : profile.rentAmount} kr./md.
Børn: ${profile.hasChildren ? profile.childrenAges.length : 0}
Streaming: ${[profile.hasNetflix, profile.hasSpotify, profile.hasHBO, profile.hasViaplay, profile.hasDisney, profile.hasAppleTV, profile.hasAmazonPrime].filter(Boolean).length}
Postnummer: ${profile.postalCode}

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
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 529) {
          return new Response(JSON.stringify({ error: "AI er overbelastet. Prøv igen om lidt." }), {
            status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Anthropic welcome-insight error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(anthropicToOpenAIStream(response.body!), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Unknown mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("onboarding-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
