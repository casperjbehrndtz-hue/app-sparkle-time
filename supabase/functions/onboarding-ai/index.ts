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
    const { mode, profile, step, budget } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "live-comment") {
      // Real-time feedback during onboarding steps
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
    } else if (mode === "welcome-insight") {
      // Generate personalized welcome insight after onboarding
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
    } else {
      return new Response(JSON.stringify({ error: "Unknown mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: mode === "welcome-insight",
        max_tokens: mode === "live-comment" ? 60 : 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "welcome-insight") {
      // Stream the welcome insight
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // For live-comment, return JSON
    const data = await response.json();
    const comment = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ comment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("onboarding-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
