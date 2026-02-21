import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { profile, budget, mode, messages: chatMessages } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
      ? `Du er Kassens AI-rådgiver – en varm, klog økonomisk ven der hjælper danske familier.

REGLER:
- Svar ALTID på dansk
- Brug konkrete kronebeløb
- Vær aldrig dømmende, altid konstruktiv
- Hold det kort og handlingsorienteret (max 250 ord)
- Brug emoji sparsomt men effektivt

Familiens profil:
${profileSummary}

Giv en personlig, prioriteret analyse med:
1. Den vigtigste indsigt om deres økonomi (1 sætning)
2. Top 3 konkrete handlinger med estimeret besparelse i kr./md.
3. Én ting de gør godt
4. En opmuntrende afslutning

Format det pænt med overskrifter og bullet points i markdown.`
      : `Du er Kassens AI-rådgiver – en varm, klog økonomisk ven.

REGLER:
- Svar ALTID på dansk
- Brug konkrete kronebeløb baseret på brugerens faktiske tal
- Vær aldrig dømmende
- Hold svar korte og præcise (max 150 ord)
- Referer til deres konkrete situation
- Brug markdown formatering

Familiens profil:
${profileSummary}

Besvar brugerens spørgsmål baseret på deres konkrete økonomi.`;

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (mode === "optimize") {
      messages.push({ role: "user", content: "Analysér min økonomi og giv mig personlige anbefalinger." });
    } else if (chatMessages && Array.isArray(chatMessages)) {
      messages.push(...chatMessages);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørgsler. Prøv igen om lidt." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kreditter opbrugt." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-fejl. Prøv igen." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("budget-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukendt fejl" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
