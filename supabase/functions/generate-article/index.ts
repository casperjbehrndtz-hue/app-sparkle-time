import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Topic seed list ──────────────────────────────────────────────────────────
const TOPICS = [
  { slug: "raadighedsbeloeb-beregning", title: "Hvad er rådighedsbeløb — og hvordan beregner du dit?", category: "Kom i gang", keywords: ["rådighedsbeløb", "beregning", "budget"], intent: "Den søger at forstå hvad rådighedsbeløb er og vil beregne sit eget" },
  { slug: "50-30-20-reglen-budget", title: "50/30/20-reglen: Den nemmeste budgetmetode", category: "Kom i gang", keywords: ["50 30 20 regel", "budgetmetode", "privatøkonomi"], intent: "Søger en simpel budgetmetode de kan starte med i dag" },
  { slug: "noedbuffer-hvad-er-det", title: "Nødbuffer: Hvor meget skal du egentlig have til siden?", category: "Opsparing", keywords: ["nødbuffer", "opsparing", "buffer beløb"], intent: "Vil vide det præcise beløb de bør spare som nødbuffer" },
  { slug: "husleje-andelsbolig-vs-eje", title: "Andelsbolig vs. ejerbolig: Hvad er billigst over 10 år?", category: "Boligøkonomi", keywords: ["andelsbolig vs ejerbolig", "boligtype", "hvad er billigst"], intent: "Overvejer boligtype og vil have et konkret regnestykke" },
  { slug: "aktiesparekonto-guide", title: "Aktiesparekonto: Alt du skal vide (og hvem der bør have en)", category: "Investering", keywords: ["aktiesparekonto", "ASK", "investering begynder"], intent: "Vil forstå aktiesparekontoen og om det giver mening for dem" },
  { slug: "el-vs-benzin-bil-oekonomi", title: "Elbil vs. benzinbil: Det totale regnestykke over 4 år", category: "Transport", keywords: ["elbil vs benzinbil", "elbil økonomi", "billigste bil"], intent: "Vil have et konkret tal: hvad koster hhv. elbil og benzinbil" },
  { slug: "pension-hvornaar-nok", title: "Hvornår har du nok opsparet til pension?", category: "Pension", keywords: ["pension opsparing nok", "hvornår kan jeg gå på pension", "pensionsberegner"], intent: "Vil vide om de er på rette spor med pension — konkret beløb" },
  { slug: "forsikringer-du-ikke-behoever", title: "5 forsikringer du sandsynligvis betaler for uden grund", category: "Besparelser", keywords: ["unødvendige forsikringer", "spare på forsikring", "hvilke forsikringer behøver jeg"], intent: "Vil skære i forsikringsudgifter og ved ikke hvad de kan undvære" },
  { slug: "dagligvarer-billigere-indkoeb", title: "Handl 30% billigere uden at ændre hvad du spiser", category: "Besparelser", keywords: ["billige dagligvarer", "spare penge mad", "budget indkøb"], intent: "Vil spare penge på dagligvarer med konkrete tips de kan bruge i dag" },
  { slug: "gaelds-sneboldsystem", title: "Sneboldsystemet: Kom ud af gæld hurtigere end du tror", category: "Gæld", keywords: ["snowball metode gæld", "nedbring gæld", "gæld strategi"], intent: "Er i gæld og søger en konkret plan for at komme ud" },
  { slug: "su-laan-afdrag-strategi", title: "SU-lån: Skal du betale det hurtigt af eller lade det stå?", category: "Gæld", keywords: ["SU-lån afdrag", "studiegæld strategi", "SU lån rente 2026"], intent: "Har SU-lån og vil vide den optimale strategi" },
  { slug: "barsel-dagpenge-beregning", title: "Barselsdagpenge 2026: Hvad får du udbetalt — og hvornår?", category: "Familie", keywords: ["barselsdagpenge 2026", "barsel beregning", "orlov dagpenge"], intent: "Er gravid eller planlægger barsel og vil vide det præcise beløb" },
  { slug: "boligstoette-hvem-kan-faa", title: "Boligstøtte: Tjek om du er berettiget (mange går glip)", category: "Boligøkonomi", keywords: ["boligstøtte berettiget", "boligstøtte beregning", "ansøg boligstøtte"], intent: "Vil vide om de kan få boligstøtte og hvor meget" },
  { slug: "haandvaerkerfradrag-2026", title: "Håndværkerfradraget 2026: Hvad må du trække fra i skat?", category: "Skat", keywords: ["håndværkerfradraget 2026", "servicefradrag", "fradrag håndværker"], intent: "Har haft håndværker og vil vide hvad de kan trække fra" },
  { slug: "aarsopgoerelse-fejl-ret-dem", title: "Årsopgørelse 2025: De 7 fejl der koster danskere penge hvert år", category: "Skat", keywords: ["årsopgørelse fejl", "ret årsopgørelse", "fradrag årsopgørelse"], intent: "Vil tjekke om årsopgørelsen er korrekt inden fristen" },
  { slug: "mobil-abonnement-bedste-pris", title: "Mobilabonnement: Hvad betaler du for meget for?", category: "Besparelser", keywords: ["billigste mobilabonnement", "mobilabonnement sammenligning 2026", "skifte mobilselskab"], intent: "Vil finde billigere mobilabonnement" },
  { slug: "ratepension-vs-aldersopsparing", title: "Ratepension vs. aldersopsparing: Hvad giver mest tilbage?", category: "Pension", keywords: ["ratepension vs aldersopsparing", "pensionstype forskel", "pension skat"], intent: "Vil vælge den rigtige pensionstype og forstå forskellen" },
  { slug: "huskop-opsparing-udbetaling", title: "Første boligkøb: Hvor meget skal du spare op til udbetaling?", category: "Boligøkonomi", keywords: ["boligkøb opsparing", "udbetaling bolig", "første bolig krav"], intent: "Planlægger boligkøb og vil vide det præcise opsparingsmål" },
  { slug: "investering-begynder-maanedlig", title: "Investering for begyndere: Sådan starter du med 500 kr./md.", category: "Investering", keywords: ["investering begynder", "start med at investere", "månedlig investering"], intent: "Vil i gang med at investere men ved ikke hvordan" },
  { slug: "inflationens-effekt-opsparing", title: "Inflation æder din opsparing — her er hvad du gør ved det", category: "Investering", keywords: ["inflation opsparing", "realrente", "beskytte opsparing inflation"], intent: "Bekymret for at inflationen reducerer deres opsparing" },
  { slug: "familiebudget-med-boern", title: "Familiebudget med børn: Udgifterne ingen fortæller dig om", category: "Familie", keywords: ["familiebudget børn", "hvad koster et barn", "børn økonomi"], intent: "Venter barn eller har småbørn og vil forstå de reelle udgifter" },
  { slug: "kreditkort-cashback-guide", title: "Cashback kreditkort i Danmark 2026: Tjener du penge på dem?", category: "Besparelser", keywords: ["cashback kreditkort Danmark", "bedste kreditkort 2026", "kreditkort fordele"], intent: "Overvejer cashback kort og vil vide om det kan betale sig" },
  { slug: "freelance-skat-moms", title: "Freelancer i Danmark: Din komplette guide til skat og moms", category: "Skat", keywords: ["freelancer skat Danmark", "moms selvstændig", "B-skat freelancer"], intent: "Er ny freelancer og vil forstå skatte- og momspligten" },
  { slug: "digitale-tjenester-overblik", title: "Stop med at betale for digitale tjenester du ikke bruger", category: "Besparelser", keywords: ["abonnementer jeg ikke bruger", "opsig abonnementer", "spare digitale tjenester"], intent: "Vil gennemgå og rydde op i abonnementer med det samme" },
  { slug: "formueprojektion-simpel-model", title: "Beregn din fremtidige formue: Hvad har du om 20 år?", category: "Investering", keywords: ["formueprojektion", "rentes rente beregning", "hvad har jeg om 20 år"], intent: "Vil se en konkret projektion af hvad de sparer op til over tid" },
  { slug: "stresstesting-privatoekonomi", title: "Hvad sker der med dit budget hvis renten stiger 3%?", category: "Boligøkonomi", keywords: ["renteforhøjelse budget", "stress test boliglån", "variabel rente risiko"], intent: "Boligejer med variabel rente der er bekymret for rentestigninger" },
  { slug: "pensionsopsparing-selvstaendig", title: "Selvstændig: Sådan bygger du en pension uden arbejdsgiver", category: "Pension", keywords: ["pension selvstændig", "IPS opsparing", "selvstændig pension Danmark"], intent: "Selvstændig der ingen arbejdsgiverpension har og vil vide hvad de skal gøre" },
  { slug: "sygeforsikring-danmark-vaerd", title: "Sygeforsikring 'danmark': Er det pengene værd i 2026?", category: "Forsikring", keywords: ["sygeforsikring danmark", "privat sundhedsforsikring", "sygeforsikring dækning"], intent: "Overvejer om de skal melde sig ind eller ud af sygeforsikring" },
  { slug: "boern-og-oekonomi-opdragelse", title: "Lær dine børn om penge: Hvad virker (og hvad ikke gør)", category: "Familie", keywords: ["børn penge opdragelse", "lommepenge børn", "børn økonomi lære"], intent: "Forælder der vil lære børn sunde pengevaner" },
  { slug: "el-forbrug-spar-penge", title: "Sæt strømregningen ned: De tiltag der faktisk virker", category: "Besparelser", keywords: ["spar på el", "strøm billigere", "elregning reducer"], intent: "Vil sænke elregningen med konkrete tiltag" },
  { slug: "frikort-topskattegranse-2026", title: "Frikort og topskat 2026: Forstå grænsen og undgå at betale for meget", category: "Skat", keywords: ["frikort 2026", "topskatgrænse 2026", "personfradrag"], intent: "Vil forstå frikortet og hvornår de rammer topskat" },
  { slug: "groen-investering-etf-guide", title: "Bæredygtig investering i Danmark: Kom i gang med grønne ETF'er", category: "Investering", keywords: ["bæredygtig investering", "grøn ETF", "ESG investering Danmark"], intent: "Vil investere etisk og bæredygtigt men ved ikke hvordan" },
  { slug: "rejseforsikring-bank-eller-separat", title: "Rejseforsikring: Hvornår er bankens dækning nok?", category: "Forsikring", keywords: ["rejseforsikring bank", "kreditkort rejseforsikring", "separat rejseforsikring"], intent: "Planlægger rejse og vil vide om de skal købe ekstra forsikring" },
  { slug: "bilopsparing-vs-billaan-2026", title: "Bil kontant vs. billån i 2026: Hvornår kan det betale sig?", category: "Transport", keywords: ["billån vs kontant", "finansiering bil", "billån rente 2026"], intent: "Skal købe bil og vil vide om de skal låne eller betale kontant" },
];

// ─── Fetch live Danish financial data ────────────────────────────────────────
async function fetchLiveData(category: string): Promise<string> {
  const dataPoints: string[] = [];

  try {
    // Nationalbanken: current Danish lending rate
    const nbRes = await fetch(
      "https://api.statbank.dk/v1/data/DNRENTD/CSV?lang=da&RENTTYPE=UDLN&Tid=2025M01,2025M06,2026M01",
      { headers: { "Accept": "text/csv" }, signal: AbortSignal.timeout(5000) }
    );
    if (nbRes.ok) {
      const csv = await nbRes.text();
      const lines = csv.split("\n").filter(l => l.includes(";"));
      if (lines.length > 1) {
        dataPoints.push(`Nationalbanken udlånsrente (seneste data): ${lines[lines.length - 1]}`);
      }
    }
  } catch { /* non-fatal */ }

  try {
    // Danmarks Statistik: average Danish disposable income
    const dstRes = await fetch(
      "https://api.statbank.dk/v1/data/INDKP101/CSV?lang=da&ENHED=KR&KOEN=TOT&Tid=2023,2024",
      { headers: { "Accept": "text/csv" }, signal: AbortSignal.timeout(5000) }
    );
    if (dstRes.ok) {
      const csv = await dstRes.text();
      const lines = csv.split("\n").filter(l => l.trim() && !l.startsWith("ENHED"));
      if (lines.length > 0) {
        dataPoints.push(`Danmarks Statistik gennemsnitlig disponibel indkomst: ${lines[lines.length - 1]}`);
      }
    }
  } catch { /* non-fatal */ }

  try {
    // Consumer price index (inflation)
    const cpiRes = await fetch(
      "https://api.statbank.dk/v1/data/PRIS9/CSV?lang=da&GRUPPE=000&Tid=2024M09,2024M10,2024M11,2024M12,2025M01,2025M02",
      { headers: { "Accept": "text/csv" }, signal: AbortSignal.timeout(5000) }
    );
    if (cpiRes.ok) {
      const csv = await cpiRes.text();
      const lines = csv.split("\n").filter(l => l.trim() && !l.startsWith("GRUPPE"));
      if (lines.length > 0) {
        dataPoints.push(`Forbrugerprisindeks (inflation): ${lines.slice(-3).join(" | ")}`);
      }
    }
  } catch { /* non-fatal */ }

  // Category-specific data
  if (category === "Boligøkonomi" || category === "Investering") {
    try {
      const rateRes = await fetch(
        "https://api.statbank.dk/v1/data/MPKRENTA/CSV?lang=da&RENTTYPE=LAAN30&Tid=2024M10,2024M11,2024M12,2025M01,2025M02",
        { headers: { "Accept": "text/csv" }, signal: AbortSignal.timeout(5000) }
      );
      if (rateRes.ok) {
        const csv = await rateRes.text();
        const lines = csv.split("\n").filter(l => l.trim() && !l.startsWith("RENTTYPE"));
        if (lines.length > 0) {
          dataPoints.push(`30-årig realkreditrente: ${lines.slice(-3).join(" | ")}`);
        }
      }
    } catch { /* non-fatal */ }
  }

  if (dataPoints.length === 0) {
    return "Bemærk: Brug de senest kendte tal fra Danmarks Statistik, Finanstilsynet og Nationalbanken. Angiv altid kilden.";
  }

  return `LIVE DANSKE FINANSDATA (hentet lige nu fra offentlige API'er — brug disse tal i artiklen):\n${dataPoints.join("\n")}`;
}

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  return `${Math.max(3, Math.round(words / 200))} min`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ─── Auth ─────────────────────────────────────────────────────────────────
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
    // ─── Pick next unused topic ───────────────────────────────────────────
    const [{ data: usedDrafts }, { data: published }] = await Promise.all([
      supabase.from("article_drafts").select("slug"),
      supabase.from("articles").select("slug"),
    ]);

    const used = new Set([
      ...(usedDrafts ?? []).map((d: { slug: string }) => d.slug),
      ...(published ?? []).map((a: { slug: string }) => a.slug),
    ]);

    const topic = TOPICS.find(t => !used.has(t.slug));
    if (!topic) {
      return new Response(JSON.stringify({ message: "All topics used" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Fetch live data in parallel with topic selection ─────────────────
    const liveData = await fetchLiveData(topic.category);

    // ─── Build Google E-E-A-T optimised prompt ────────────────────────────
    const today = new Date().toLocaleDateString("da-DK", { year: "numeric", month: "long" });

    const prompt = `Du er chefredaktør på Kassen — Danmarks skarpeste privatøkonomiske medie. Du skriver i dag (${today}) en artikel til vores guides-sektion.

EMNE: ${topic.title}
KATEGORI: ${topic.category}
SØGEINTENTION: ${topic.intent}
PRIMÆRE SØGEORD: ${topic.keywords.join(", ")}

${liveData}

─── GOOGLES RANKING-SIGNALER DU SKAL FØLGE I 2026 ───────────────────────────

**E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness):**
- Skriv som en der HAR erfaring med emnet — brug "da vi kiggede på tallene", "i vores beregninger", "det overraskede os"
- Angiv altid konkrete tal med kilde: "(kilde: Danmarks Statistik, 2024)" eller "(Nationalbanken, marts 2026)"
- Vær villig til at have en holdning: "Vi mener at...", "Det er faktisk en dårlig idé fordi..."

**Søgeintention og featured snippets:**
- Start artiklen med en direkte, kort svarblok der besvarer søgeintentionen på 2-3 linjer (dette fanger featured snippet)
- Brug H2/H3 overskrifter som spørgsmål folk faktisk søger på

**People Also Ask (PAA) sektion:**
- Afslut med 3-4 FAQ spørgsmål og korte svar (disse rangerer i "Folk spørger også"-boksen)

**Helpful Content Update:**
- Gå DYBERE end hvad folk finder alle andre steder — giv det unikke perspektiv
- Inkludér en konkret beregning eller tabel med tal
- Nævn en common mistake folk begår (giver troværdighed)

─── SKRIVESTIL ───────────────────────────────────────────────────────────────

- Dansk, direkte, lidt personlig — som en klog ven der arbejder med økonomi
- Bland korte sætninger med lidt længere. Undgå monoton rytme.
- ALDRIG: "Det er vigtigt at...", "Man bør overveje...", "I en verden hvor...", "I denne artikel vil vi..."
- Brug gerne "faktisk", "overraskende nok", "det fleste glemmer", "her er hvad vi fandt"
- Skriv "vi" og "dig" — ikke "man" og "borgeren"

─── STRUKTUR (følg denne nøjagtigt) ─────────────────────────────────────────

## [Direkte svar på søgeintentionen — 2-3 linjer som featured snippet]

## [H2 der besvarer det primære spørgsmål]
[300-400 ord med konkrete tal og en tabel eller bullet-liste]

## [H2 der uddyber eller giver et alternativt perspektiv]
[250-300 ord]

## [H2 med den "common mistake" folk begår — praktisk og konkret]
[200-250 ord]

## Ofte stillede spørgsmål
**[Spørgsmål 1 folk søger på]**
[Kort, direkte svar — 2-4 linjer]

**[Spørgsmål 2]**
[Svar]

**[Spørgsmål 3]**
[Svar]

─── SLUTNING ─────────────────────────────────────────────────────────────────
Afslut naturligt med en overgang til at beregne i Kassen — ikke som en reklame, men som et logisk næste skridt for læseren.

Samlet længde: 900-1200 ord. Start direkte med ## — ingen titel øverst.`;

    // ─── Call Claude Opus ─────────────────────────────────────────────────
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": anthropicKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic: ${await res.text()}`);

    const data = await res.json();
    const content = data.content[0].text as string;

    // Extract excerpt from first real paragraph
    const excerpt = content
      .split("\n")
      .find(l => l.trim() && !l.startsWith("#") && !l.startsWith("-") && !l.startsWith("|") && l.length > 60)
      ?.replace(/\*\*/g, "")
      .slice(0, 160) ?? topic.title;

    const { data: draft, error } = await supabase
      .from("article_drafts")
      .insert({
        slug: topic.slug,
        title: topic.title,
        excerpt,
        category: topic.category,
        read_time: estimateReadTime(content),
        content,
        keywords: topic.keywords,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✓ Draft created: "${topic.title}" (id: ${draft.id})`);

    return new Response(
      JSON.stringify({ success: true, draft_id: draft.id, title: topic.title }),
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
