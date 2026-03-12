import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Topic seed list — 60+ Danish personal finance topics ───────────────────
// Ordered by search volume / relevance priority
const TOPICS = [
  { slug: "raadighedsbeloeb-beregning", title: "Hvad er rådighedsbeløb — og hvordan beregner du dit?", category: "Kom i gang", keywords: ["rådighedsbeløb", "beregning", "budget"] },
  { slug: "50-30-20-reglen-budget", title: "50/30/20-reglen: Den nemmeste budgetmetode", category: "Kom i gang", keywords: ["50 30 20", "budgetmetode", "personlig økonomi"] },
  { slug: "noedbuffer-hvad-er-det", title: "Nødbuffer: Hvor meget skal du have til siden?", category: "Opsparing", keywords: ["nødbuffer", "opsparing", "buffer"] },
  { slug: "husleje-andelsbolig-vs-eje", title: "Andelsbolig vs. ejerbolig: Hvad er billigst i 2026?", category: "Boligøkonomi", keywords: ["andelsbolig", "ejerbolig", "husleje"] },
  { slug: "aktiesparekonto-guide", title: "Aktiesparekonto: Hvad er det og hvem bør have en?", category: "Investering", keywords: ["aktiesparekonto", "investering", "skat"] },
  { slug: "el-vs-benzin-bil-oekonomi", title: "Elbil vs. benzinbil: Hvad er billigst over 4 år?", category: "Transport", keywords: ["elbil", "benzinbil", "billige biler"] },
  { slug: "pension-hvornaar-nok", title: "Hvornår har du nok til pension? En simpel beregning", category: "Pension", keywords: ["pension", "opsparing", "folkepension"] },
  { slug: "forsikringer-du-ikke-behoever", title: "5 forsikringer de fleste danskere betaler for forgæves", category: "Besparelser", keywords: ["forsikringer", "spare penge", "unødvendige udgifter"] },
  { slug: "dagligvarer-billigere-indkoeb", title: "Handl 30% billigere: En guide til strategisk indkøb", category: "Besparelser", keywords: ["dagligvarer", "billigt", "indkøb"] },
  { slug: "gaelds-sneboldsystem", title: "Sneboldsystemet: Den psykologiske vej ud af gæld", category: "Gæld", keywords: ["gæld", "nedbringelse", "snowball"] },
  { slug: "su-laan-afdrag-strategi", title: "SU-lån: Skal du betale det hurtigt af eller lade det stå?", category: "Gæld", keywords: ["SU-lån", "studiegæld", "afdrag"] },
  { slug: "barsel-dagpenge-beregning", title: "Barselsdagpenge 2026: Hvad får du udbetalt?", category: "Familie", keywords: ["barselsdagpenge", "barsel", "orlov"] },
  { slug: "boligstoette-hvem-kan-faa", title: "Boligstøtte: Hvem er berettiget og hvad kan du få?", category: "Boligøkonomi", keywords: ["boligstøtte", "tilskud", "husleje"] },
  { slug: "pensionsopsparing-selvstaendig", title: "Selvstændig? Sådan sikrer du din pension uden arbejdsgiver", category: "Pension", keywords: ["selvstændig", "pension", "opsparing"] },
  { slug: "boern-og-oekonomi-laer-dem-tidligt", title: "Lær dine børn om penge fra de er 5 år", category: "Familie", keywords: ["børn", "penge", "opdragelse"] },
  { slug: "haandvaerkerfradrag-2026", title: "Håndværkerfradraget 2026: Hvad må du trække fra?", category: "Skat", keywords: ["håndværkerfradraget", "fradrag", "skat"] },
  { slug: "aarsopgoerelse-fejl-ret-dem", title: "Årsopgørelse: De 7 fejl der koster dig penge", category: "Skat", keywords: ["årsopgørelse", "fejl", "skat"] },
  { slug: "mobil-abonnement-bedste-pris", title: "Mobilabonnement: Sådan betaler du ikke for meget", category: "Besparelser", keywords: ["mobilabonnement", "billig mobil", "telefonabonnement"] },
  { slug: "ratepension-vs-aldersopsparing", title: "Ratepension vs. aldersopsparing: Hvad vælger du?", category: "Pension", keywords: ["ratepension", "aldersopsparing", "pension"] },
  { slug: "lejlighed-udland-skat", title: "Udlejning af din bolig på Airbnb: Hvad må du tjene skattefrit?", category: "Skat", keywords: ["Airbnb", "udlejning", "skat"] },
  { slug: "bilopsparing-vs-billaan", title: "Bil kontant vs. billån: Hvornår giver hvert valg mening?", category: "Transport", keywords: ["billån", "bil opsparing", "finansiering"] },
  { slug: "frikort-topskattegranse", title: "Frikort og topskat: Forstå grænsen for 2026", category: "Skat", keywords: ["frikort", "topskat", "personfradrag"] },
  { slug: "groen-investering-etf", title: "Grøn investering: Kom i gang med bæredygtige ETF'er", category: "Investering", keywords: ["grøn investering", "ETF", "bæredygtig"] },
  { slug: "sygeforsikring-danmark-loens-omt", title: "Sygeforsikring 'danmark': Hvad dækker den og er det det værd?", category: "Forsikring", keywords: ["sygeforsikring", "danmark", "dækning"] },
  { slug: "huskop-opsparing-udbetaling", title: "Køb din første bolig: Hvor meget skal du spare op?", category: "Boligøkonomi", keywords: ["boligkøb", "udbetaling", "opsparing"] },
  { slug: "formueprojektion-simpel-model", title: "Beregn din fremtidige formue med én simpel ligning", category: "Investering", keywords: ["formueprojektion", "opsparing", "rentes rente"] },
  { slug: "stresstesting-privatoekonomi", title: "Hvad sker der med din økonomi hvis renten stiger 3%?", category: "Boligøkonomi", keywords: ["stress test", "rente", "boliglån"] },
  { slug: "familiebudget-med-boern", title: "Familiebudget med børn: De skjulte udgifter ingen fortæller dig om", category: "Familie", keywords: ["familiebudget", "børn", "udgifter"] },
  { slug: "kreditkort-cashback-guide", title: "Cashback kreditkort i Danmark: Tjener du penge på dem?", category: "Besparelser", keywords: ["kreditkort", "cashback", "fordele"] },
  { slug: "freelance-skat-moms", title: "Freelancer: En simpel guide til moms og skat i Danmark", category: "Skat", keywords: ["freelancer", "moms", "skat"] },
  { slug: "rejseforsikring-hvornaar-nok", title: "Rejseforsikring: Hvornår er din bankens dækning nok?", category: "Forsikring", keywords: ["rejseforsikring", "bank", "dækning"] },
  { slug: "koebmands-konceptet-budget", title: "Købmandstanken: Derfor bør du tænke på dig selv som en virksomhed", category: "Kom i gang", keywords: ["privatøkonomi", "strategi", "budget"] },
  { slug: "digitale-tjenester-overblik", title: "Gå dine digitale tjenester igennem: Du betaler nok for meget", category: "Besparelser", keywords: ["abonnementer", "digitale tjenester", "spare"] },
  { slug: "investering-begynder-maanedlig", title: "Investering for begyndere: Start med 500 kr./md.", category: "Investering", keywords: ["investering", "begynder", "månedlig opsparing"] },
  { slug: "inflationens-effekt-opsparing", title: "Inflation æder din opsparing — her er hvad du gør", category: "Investering", keywords: ["inflation", "opsparing", "købekraft"] },
];

function generateSlug(seed: string): string {
  return seed.toLowerCase().replace(/[æ]/g, "ae").replace(/[ø]/g, "oe").replace(/[å]/g, "aa").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  const minutes = Math.round(words / 200);
  return `${Math.max(3, minutes)} min`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ─── Authenticate cron requests ──────────────────────────────────────────
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: "No Anthropic key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ─── Find next unused topic ─────────────────────────────────────────────
    const [{ data: usedDrafts }, { data: publishedArticles }] = await Promise.all([
      supabase.from("article_drafts").select("slug"),
      supabase.from("articles").select("slug"),
    ]);

    const usedSlugs = new Set([
      ...(usedDrafts ?? []).map((d: { slug: string }) => d.slug),
      ...(publishedArticles ?? []).map((a: { slug: string }) => a.slug),
    ]);

    const nextTopic = TOPICS.find((t) => !usedSlugs.has(t.slug));
    if (!nextTopic) {
      return new Response(JSON.stringify({ message: "All topics used — add more topics to seed list" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Generate article with Claude ──────────────────────────────────────
    const prompt = `Du er en erfaren dansk privatøkonomi-journalist, der skriver til Kassen — et gratis budgetværktøj for danskere.

Skriv en artikel på dansk med titlen: "${nextTopic.title}"

Krav:
- 700-1000 ord, velstruktureret med H2 og H3 overskrifter (brug ## og ###)
- Skriv i et naturligt, conversationelt dansk — som en klog ven der forklarer det, ikke som et AI-system
- Brug konkrete danske tal og eksempler fra den virkelige verden (Statistikbanken, Boliga, DR, Finanstilsynet)
- Undgå generiske sætninger som "Det er vigtigt at..." eller "Man bør overveje..." — vær konkret
- Brug **fed tekst** til nøgletal og pointer
- Inkludér en tabel eller bullet-liste med faktapoint
- Afslut med en naturlig overgang til at prøve Kassen
- Kategorien er: ${nextTopic.category}
- Søgeord der skal indgå naturligt: ${nextTopic.keywords.join(", ")}

Artiklen skal føles som noget fra Finans.dk eller DR Penge — ikke som AI-genereret indhold.

Start artiklen direkte med ## (første sektion) — ingen introduction eller titel øverst.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": anthropicKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      throw new Error(`Anthropic error: ${err}`);
    }

    const anthropicData = await anthropicRes.json();
    const content = anthropicData.content[0].text as string;
    const readTime = estimateReadTime(content);

    // ─── Generate excerpt from first paragraph ──────────────────────────────
    const lines = content.split("\n").filter((l: string) => l.trim() && !l.startsWith("#") && !l.startsWith("-") && !l.startsWith("|"));
    const excerpt = lines[0]?.replace(/\*\*/g, "").slice(0, 160) ?? nextTopic.title;

    // ─── Save to article_drafts ─────────────────────────────────────────────
    const { data: draft, error: insertError } = await supabase
      .from("article_drafts")
      .insert({
        slug: nextTopic.slug,
        title: nextTopic.title,
        excerpt,
        category: nextTopic.category,
        read_time: readTime,
        content,
        keywords: nextTopic.keywords,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`Generated draft: ${nextTopic.title} (id: ${draft.id})`);

    return new Response(
      JSON.stringify({ success: true, draft_id: draft.id, title: nextTopic.title }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-article error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
