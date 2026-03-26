import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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

// English topic seeds for expat/international audience
const ENGLISH_TOPICS = [
  { slug: "denmark-tax-system-expat-guide", title: "Danish Tax System Explained: A Complete Guide for Expats", category: "Tax", keywords: ["denmark tax system", "danish tax expat", "skat denmark"], intent: "Expat who just moved to Denmark and needs to understand the tax system" },
  { slug: "cost-of-living-denmark-2026", title: "Cost of Living in Denmark 2026: Real Numbers, No Sugarcoating", category: "Getting Started", keywords: ["cost of living denmark", "denmark expenses", "living costs copenhagen"], intent: "Considering moving to Denmark or just arrived and wants real cost breakdown" },
  { slug: "cpr-nemid-mitid-banking-setup", title: "CPR, MitID & Danish Banking: Your First 30 Days in Denmark", category: "Getting Started", keywords: ["cpr number denmark", "mitid setup", "danish bank account expat"], intent: "Just arrived in Denmark and needs to set up essential financial infrastructure" },
  { slug: "danish-pension-system-explained", title: "Danish Pension System: ATP, Company Pension & What You Actually Get", category: "Pension", keywords: ["danish pension system", "ATP pension denmark", "pension expat denmark"], intent: "Wants to understand how Danish pensions work and what they'll receive" },
  { slug: "buying-property-denmark-foreigner", title: "Buying Property in Denmark as a Foreigner: Rules, Costs & Process", category: "Housing", keywords: ["buy property denmark foreigner", "danish housing market", "andelsbolig vs ejerbolig english"], intent: "Foreign resident wanting to buy property in Denmark" },
  { slug: "danish-healthcare-system-costs", title: "Danish Healthcare: What's Free, What's Not & How to Save", category: "Savings", keywords: ["denmark healthcare cost", "danish health insurance", "sundhedsforsikring english"], intent: "Wants to understand what healthcare costs exist despite the 'free' system" },
  { slug: "salary-negotiation-denmark", title: "Salary Negotiation in Denmark: What to Expect After Tax", category: "Career", keywords: ["denmark salary after tax", "danish salary negotiation", "net salary denmark"], intent: "Job offer in Denmark and wants to understand real take-home pay" },
  { slug: "investing-denmark-beginner-guide", title: "Investing in Denmark: Aktiesparekonto, ETFs & Tax Rules for Beginners", category: "Investing", keywords: ["investing denmark", "aktiesparekonto english", "ETF denmark tax"], intent: "Wants to start investing in Denmark but doesn't understand the tax-advantaged accounts" },
  { slug: "a-kasse-dagpenge-unemployment", title: "A-kasse & Dagpenge: How Danish Unemployment Insurance Actually Works", category: "Safety Net", keywords: ["a-kasse denmark", "dagpenge english", "unemployment denmark expat"], intent: "Wants to understand whether to join an A-kasse and how unemployment benefits work" },
  { slug: "child-benefits-denmark-boernepenge", title: "Child Benefits in Denmark: Børnepenge, Childcare Costs & Family Budget", category: "Family", keywords: ["child benefits denmark", "børnepenge english", "childcare costs denmark"], intent: "Parent or expecting parent wanting to understand Danish family financial support" },
  { slug: "su-student-finance-denmark", title: "SU: Getting Paid to Study in Denmark — How It Works", category: "Education", keywords: ["SU denmark", "student finance denmark", "study grant denmark"], intent: "Student wanting to understand SU eligibility and amounts" },
  { slug: "denmark-vs-other-countries-finances", title: "Denmark's High Taxes, High Quality: Is It Actually Worth It Financially?", category: "Getting Started", keywords: ["denmark high taxes worth it", "denmark vs usa finances", "nordic model explained"], intent: "Comparing Denmark financially to their home country" },
  { slug: "skat-annual-tax-return-guide", title: "Your Danish Tax Return (Årsopgørelse): A Step-by-Step English Guide", category: "Tax", keywords: ["danish tax return english", "årsopgørelse guide", "skat tax return"], intent: "Needs to file or check their Danish tax return but doesn't read Danish well" },
  { slug: "forskerskat-researcher-tax-scheme", title: "Forskerskat: Denmark's 27% Flat Tax for Expat Workers Explained", category: "Tax", keywords: ["forskerskat denmark", "researcher tax scheme", "expat tax denmark 27%"], intent: "Eligible for or curious about the special expat tax scheme" },
  { slug: "budgeting-in-dkk-expat-tips", title: "Budgeting in DKK: Practical Tips for Managing Money in Denmark", category: "Getting Started", keywords: ["budgeting denmark", "manage money denmark", "dkk budget tips"], intent: "Expat who wants practical budgeting advice adapted to Danish context" },
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
  if (category === "Boligøkonomi" || category === "Investering" || category === "Housing" || category === "Investing") {
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
    return "Note: Use the latest known figures from Danmarks Statistik, Finanstilsynet, and Nationalbanken. Always cite the source.";
  }

  return `LIVE DANISH FINANCIAL DATA (fetched now from public APIs — use these figures in the article):\n${dataPoints.join("\n")}`;
}

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  return `${Math.max(3, Math.round(words / 200))} min`;
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

function buildDanishPrompt(topic: { title: string; category: string; keywords: string[]; intent: string }, liveData: string, internalLinks: string, clusterContext: string): string {
  const today = new Date().toLocaleDateString("da-DK", { year: "numeric", month: "long" });

  return `Du er chefredaktør på NemtBudget — Danmarks skarpeste privatøkonomiske medie. Du skriver i dag (${today}) en artikel til vores guides-sektion.

EMNE: ${topic.title}
KATEGORI: ${topic.category}
SØGEINTENTION: ${topic.intent}
PRIMÆRE SØGEORD: ${topic.keywords.join(", ")}

${liveData}

─── AI OVERVIEW & FEATURED SNIPPET OPTIMERING ─────────────────────────────

**Answer Box (KRITISK — dette fanger Google AI Overviews):**
- Start ALTID artiklen med en <div class="answer-box"> der indeholder et direkte, faktuelt svar i MAX 50 ord
- Format: <div class="answer-box"><p><strong>[Direkte svar med konkret tal]</strong></p></div>
- Eksempel: <div class="answer-box"><p><strong>Et godt rådighedsbeløb for en single er 5.000-7.000 kr./md. efter faste udgifter. For en familie med to børn bør det ligge på 10.000-14.000 kr./md.</strong></p></div>

**Speakable Content:**
- Alle H2-overskrifter og FAQ-svar skal være selvstændigt forståelige
- Google Assistent læser dem højt — brug klare, deklarative sætninger

─── ENTITY-FIRST WRITING (Googles NLP) ────────────────────────────────────

- Skriv i subjekt-prædikat-objekt mønstre: "Personfradraget i 2026 er 49.700 kr." — IKKE "I 2026 er der et fradrag man kan bruge"
- NÆVN konkrete entities: Danmarks Statistik, Skattestyrelsen, Nationalbanken, Finanstilsynet
- Brug DefinedTerm-mønster: "<dfn>Rådighedsbeløb</dfn> er det beløb du har til rådighed efter faste udgifter er betalt"

─── GOOGLES RANKING-SIGNALER I 2026 ───────────────────────────────────────

**E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness):**
- Skriv som en der HAR erfaring — brug "da vi kiggede på tallene", "i vores beregninger", "det overraskede os"
- Angiv altid konkrete tal med kilde: "(kilde: Danmarks Statistik, 2024)" eller "(Nationalbanken, 2026)"
- Vær villig til at have en holdning: "Vi mener at...", "Det er faktisk en dårlig idé fordi..."

**People Also Ask (PAA):**
- Afslut med 4-5 FAQ spørgsmål og korte svar
- Wrap hvert svar i <div class="faq-answer">

**Helpful Content Update:**
- Gå DYBERE end hvad folk finder alle andre steder
- Inkluder MINDST én konkret beregning i en HTML <table>
- Nævn en common mistake folk begår

─── TABEL & BEREGNING (VIGTIGT for rich results) ─────────────────────────

- Inkluder MINDST én HTML <table> med relevante beregninger
- Brug de LIVE FINANSDATA ovenfor i tabellen hvor relevant
- Eksempel:
  <table>
    <thead><tr><th>Post</th><th>Beløb/md.</th><th>Andel</th></tr></thead>
    <tbody>
      <tr><td>Faste udgifter</td><td>15.000 kr.</td><td>50%</td></tr>
      <tr><td>Ønsker</td><td>9.000 kr.</td><td>30%</td></tr>
      <tr><td>Opsparing</td><td>6.000 kr.</td><td>20%</td></tr>
    </tbody>
  </table>

─── KILDER & CITATIONS (KRITISK for AI Overview citation) ────────────────

- ALTID inkluder en "Kilder" sektion som NÆSTSIDSTE element (før CTA):
  <section class="references"><h3>Kilder</h3><ol>
    <li><cite>Danmarks Statistik</cite> — dst.dk (2024)</li>
    <li><cite>Nationalbanken</cite> — nationalbanken.dk (2026)</li>
  </ol></section>
- Referer til kilder i teksten: "...(kilde: Danmarks Statistik) [1]"

─── SKRIVESTIL ───────────────────────────────────────────────────────────────

- Dansk, direkte, lidt personlig — som en klog ven der arbejder med økonomi
- Bland korte sætninger med lidt længere. Undgå monoton rytme.
- ALDRIG: "Det er vigtigt at...", "Man bør overveje...", "I en verden hvor...", "I denne artikel vil vi..."
- Brug gerne "faktisk", "overraskende nok", "det fleste glemmer", "her er hvad vi fandt"
- Skriv "vi" og "dig" — ikke "man" og "borgeren"

─── STRUKTUR (følg denne NØJAGTIGT) ─────────────────────────────────────────

<div class="answer-box"><p><strong>[Direkte svar — max 50 ord med konkret tal]</strong></p></div>

## [H2 med entity-statement der besvarer primært spørgsmål]
[300-400 ord med <dfn>-tags, konkrete tal, og kildeangivelser]

<table>[Beregning med live data hvor muligt]</table>

## [H2 der uddyber med alternativt perspektiv]
[250-350 ord]

## [H2 med common mistake — praktisk og konkret]
[200-250 ord]

## Ofte stillede spørgsmål
<div class="faq-item"><h3>[Spørgsmål 1]</h3><div class="faq-answer">[Svar]</div></div>
<div class="faq-item"><h3>[Spørgsmål 2]</h3><div class="faq-answer">[Svar]</div></div>
<div class="faq-item"><h3>[Spørgsmål 3]</h3><div class="faq-answer">[Svar]</div></div>
<div class="faq-item"><h3>[Spørgsmål 4]</h3><div class="faq-answer">[Svar]</div></div>

─── INTERN LINKING ───────────────────────────────────────────────────────────
- 2-3 kontekstuelle links til relaterede guides: <a href="/guides/slug">titel</a>
- "Læs også"-sektion med 2-3 relaterede artikellinks
- Cross-link til: <a href="https://www.parfinans.dk">ParFinans</a> eller <a href="https://xn--brneskat-54a.dk">Børneskat.dk</a>
${clusterContext ? `\nTOPICAL AUTHORITY CLUSTER-LINKS (DU SKAL inkludere disse):\n${clusterContext}` : ""}
${internalLinks ? `\nEksisterende guides du kan linke til:\n${internalLinks}` : ""}

<section class="references"><h3>Kilder</h3><ol>[Nummererede kilder med cite-tags]</ol></section>

─── SLUTNING ─────────────────────────────────────────────────────────────────
Afslut naturligt med en overgang til at beregne i NemtBudget — ikke som reklame, men som logisk næste skridt.

Samlet længde: 1.100-1.400 ord. Start direkte med <div class="answer-box"> — ingen titel øverst.`;
}

function buildEnglishPrompt(topic: { title: string; category: string; keywords: string[]; intent: string }, liveData: string, internalLinks: string): string {
  const today = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" });

  return `You are the editor-in-chief of NemtBudget — Denmark's sharpest personal finance publication. Today (${today}) you are writing a guide for our English-language section, targeting expats, international workers, and English-speaking residents in Denmark.

TOPIC: ${topic.title}
CATEGORY: ${topic.category}
SEARCH INTENT: ${topic.intent}
PRIMARY KEYWORDS: ${topic.keywords.join(", ")}

${liveData}

─── AI OVERVIEW & FEATURED SNIPPET OPTIMIZATION ─────────────────────────────

**Answer Box (CRITICAL — this captures Google AI Overviews):**
- ALWAYS start the article with a <div class="answer-box"> containing a direct, factual answer in MAX 50 words
- Format: <div class="answer-box"><p><strong>[Direct answer with specific numbers]</strong></p></div>

**Speakable Content:**
- All H2 headings and FAQ answers must be independently understandable
- Use clear, declarative sentences

─── BILINGUAL FINANCIAL TERMS ───────────────────────────────────────────────

CRITICAL: Always include the Danish term alongside the English explanation using this pattern:
- "<dfn>Aktiesparekonto</dfn> (stock savings account)" on first mention
- "Your <dfn>årsopgørelse</dfn> (annual tax statement) from SKAT..."
- "The <dfn>personfradrag</dfn> (personal tax allowance) in 2026 is 49,700 DKK (~€6,660/~$7,250)"
- ALWAYS show amounts in DKK first, then approximate EUR and USD in parentheses

This helps expats recognize the Danish terms they'll encounter on official Danish websites and documents.

─── ENTITY-FIRST WRITING (Google's NLP) ────────────────────────────────────

- Write in subject-predicate-object patterns: "The personal tax allowance in 2026 is 49,700 DKK" — NOT "In 2026 there is an allowance one can use"
- NAME specific entities: Danmarks Statistik, Skattestyrelsen (Danish Tax Agency), Nationalbanken (Danish Central Bank), Finanstilsynet (Financial Supervisory Authority)
- Always parenthesize the English translation of Danish institutions on first mention

─── GOOGLE RANKING SIGNALS 2026 ───────────────────────────────────────────

**E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness):**
- Write from experience — use "when we looked at the numbers", "in our calculations", "what surprised us"
- Always cite specific figures with source: "(source: Danmarks Statistik, 2024)"
- Have opinions: "We think that...", "This is actually a bad idea because..."

**People Also Ask (PAA):**
- End with 4-5 FAQ questions and short answers
- Wrap each answer in <div class="faq-answer">

**Helpful Content Update:**
- Go DEEPER than what people find elsewhere
- Include AT LEAST one concrete calculation in an HTML <table>
- Mention a common mistake people make

─── TABLE & CALCULATIONS ─────────────────────────────────────────────────

- Include AT LEAST one HTML <table> with relevant calculations
- Show DKK amounts with EUR/USD equivalents
- Use the LIVE FINANCIAL DATA above where relevant

─── SOURCES & CITATIONS ────────────────────────────────────────────────────

- ALWAYS include a "Sources" section as second-to-last element (before CTA):
  <section class="references"><h3>Sources</h3><ol>
    <li><cite>Danmarks Statistik</cite> — dst.dk (2024)</li>
    <li><cite>Nationalbanken</cite> — nationalbanken.dk (2026)</li>
  </ol></section>

─── WRITING STYLE ───────────────────────────────────────────────────────────

- English, direct, slightly personal — like a knowledgeable friend who works in finance and lives in Denmark
- Mix short sentences with longer ones. Avoid monotonous rhythm.
- NEVER: "It is important to...", "One should consider...", "In a world where...", "In this article we will..."
- Use "actually", "surprisingly", "most people forget", "here's what we found"
- Write "we" and "you" — not "one" and "the citizen"
- Acknowledge the expat perspective: "If you're coming from [US/UK/EU], this might seem..."

─── STRUCTURE (follow EXACTLY) ─────────────────────────────────────────────

<div class="answer-box"><p><strong>[Direct answer — max 50 words with specific numbers]</strong></p></div>

## [H2 with entity-statement answering the primary question]
[300-400 words with <dfn>-tags for Danish terms, specific numbers, and source citations]

<table>[Calculation with live data where possible, DKK + EUR/USD]</table>

## [H2 expanding with alternative perspective]
[250-350 words]

## [H2 with common mistake — practical and specific]
[200-250 words]

## Frequently Asked Questions
<div class="faq-item"><h3>[Question 1]</h3><div class="faq-answer">[Answer]</div></div>
<div class="faq-item"><h3>[Question 2]</h3><div class="faq-answer">[Answer]</div></div>
<div class="faq-item"><h3>[Question 3]</h3><div class="faq-answer">[Answer]</div></div>
<div class="faq-item"><h3>[Question 4]</h3><div class="faq-answer">[Answer]</div></div>

─── INTERNAL LINKING ────────────────────────────────────────────────────────
- 2-3 contextual links to related guides: <a href="/guides/slug">title</a>
- "Read also" section with 2-3 related article links
- Cross-link to: <a href="https://www.parfinans.dk">ParFinans</a> or <a href="https://xn--brneskat-54a.dk">Børneskat.dk</a>
${internalLinks ? `\nExisting guides you can link to:\n${internalLinks}` : ""}

<section class="references"><h3>Sources</h3><ol>[Numbered sources with cite-tags]</ol></section>

─── ENDING ─────────────────────────────────────────────────────────────────
End naturally with a transition to calculating in NemtBudget — not as advertising, but as a logical next step.

Total length: 1,100-1,400 words. Start directly with <div class="answer-box"> — no title at the top.`;
}

// ─── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
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
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const results: { locale: string; title: string; slug: string; id: string }[] = [];

    // ─── Generate for both locales ──────────────────────────────────────
    for (const locale of ["da", "en"] as const) {
      const topicResult = await pickTopic(locale, supabase, anthropicKey);
      if (!topicResult) {
        console.log(`⏭ Skipping ${locale}: no topic available`);
        continue;
      }

      const topic = topicResult;

      // Fetch live data and related articles
      const liveData = await fetchLiveData(topic.category);

      let internalLinks = "";
      try {
        const { data: related } = await supabase
          .from("articles")
          .select("title, slug, locale")
          .eq("status", "published")
          .eq("locale", locale)
          .order("published_at", { ascending: false })
          .limit(10);
        if (related?.length) {
          internalLinks = related.map((r: { title: string; slug: string }) => `- "${r.title}" → /guides/${r.slug}`).join("\n");
        }
      } catch { /* ignore */ }

      // Fetch cluster relationships (only for Danish)
      let clusterContext = "";
      if (locale === "da") {
        try {
          const { data: clusterLinks } = await supabase
            .from("topic_clusters")
            .select("pillar_slug, cluster_slug, anchor_text, reverse_anchor_text")
            .or(`pillar_slug.eq.${topic.slug},cluster_slug.eq.${topic.slug}`);
          if (clusterLinks?.length) {
            clusterContext = clusterLinks.map((c) => {
              const isCluster = c.cluster_slug === topic.slug;
              return isCluster
                ? `- LINK OP TIL PILLAR: "${c.anchor_text}" → /guides/${c.pillar_slug}`
                : `- LINK NED TIL CLUSTER: "${c.reverse_anchor_text}" → /guides/${c.cluster_slug}`;
            }).join("\n");
          }
        } catch { /* ignore */ }
      }

      // Build prompt based on locale
      const prompt = locale === "da"
        ? buildDanishPrompt(topic, liveData, internalLinks, clusterContext)
        : buildEnglishPrompt(topic, liveData, internalLinks);

      // Call Claude
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "anthropic-version": "2023-06-01",
          "x-api-key": anthropicKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`Anthropic (${locale}): ${await res.text()}`);

      const data = await res.json();
      const content = data.content[0].text as string;

      // Extract excerpt
      const excerpt = content
        .split("\n")
        .find(l => l.trim() && !l.startsWith("#") && !l.startsWith("-") && !l.startsWith("|") && l.length > 60)
        ?.replace(/\*\*/g, "")
        .slice(0, 160) ?? topic.title;

      // Publish
      const { data: article, error } = await supabase
        .from("articles")
        .insert({
          slug: topic.slug,
          title: topic.title,
          excerpt,
          category: topic.category,
          read_time: estimateReadTime(content),
          content,
          keywords: topic.keywords,
          locale,
          status: "published",
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✓ Published (${locale}): "${topic.title}" (id: ${article.id})`);
      results.push({ locale, title: topic.title, slug: topic.slug, id: article.id });

      // Ping IndexNow
      try {
        const path = locale === "en" ? `/en/guides/${topic.slug}` : `/guides/${topic.slug}`;
        await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(`https://nemtbudget.nu${path}`)}&key=a563611ec50b9a5e31fdadcde3e13e1c`);
      } catch { /* non-critical */ }
    }

    // Single Vercel redeploy after both articles
    const deployHook = Deno.env.get("VERCEL_DEPLOY_HOOK");
    if (deployHook && results.length > 0) {
      fetch(deployHook, { method: "POST" }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ success: true, articles: results }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("generate-article error:", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});

// ─── Topic picker ────────────────────────────────────────────────────────────

async function pickTopic(
  locale: "da" | "en",
  supabase: ReturnType<typeof createClient>,
  anthropicKey: string
): Promise<{ slug: string; title: string; category: string; keywords: string[]; intent: string } | null> {

  // Get all used slugs for this locale
  const [{ data: usedDrafts }, { data: published }] = await Promise.all([
    supabase.from("article_drafts").select("slug"),
    supabase.from("articles").select("slug").eq("locale", locale),
  ]);

  const used = new Set([
    ...(usedDrafts ?? []).map((d: { slug: string }) => d.slug),
    ...(published ?? []).map((a: { slug: string }) => a.slug),
  ]);

  const seedTopics = locale === "da" ? TOPICS : ENGLISH_TOPICS;
  let topic = seedTopics.find(t => !used.has(t.slug));

  // Auto-generate new topic when seed list is exhausted
  if (!topic) {
    const { data: discovered } = await supabase
      .from("seo_discovered_keywords")
      .select("keyword, impressions")
      .eq("status", "new")
      .order("impressions", { ascending: false })
      .limit(5);

    const { data: existing } = await supabase
      .from("articles")
      .select("title, slug, category")
      .eq("status", "published")
      .eq("locale", locale)
      .order("published_at", { ascending: false })
      .limit(20);

    const existingTitles = (existing ?? []).map(a => `- ${a.title} (${a.category})`).join("\n");
    const discoveredKws = (discovered ?? []).map(d => d.keyword).join(", ");

    const topicPrompt = locale === "da"
      ? `Du er SEO-strateg for NemtBudget.nu — et dansk privatøkonomi-site.

Eksisterende artikler:
${existingTitles}

${discoveredKws ? `Google Search Console har fundet disse nye søgeord med trafik: ${discoveredKws}` : ""}

Generer ÉT nyt artikelemne om dansk privatøkonomi der:
- IKKE overlapper med eksisterende artikler
- Har høj søgeintention (folk vil have et konkret svar)
- Er relevant for danske forbrugere i 2026
${discoveredKws ? "- Prioriter emner der matcher de opdagede søgeord" : ""}

Returner KUN valid JSON:
{"slug": "url-venlig-slug", "title": "Artikeltitel", "category": "Kategori", "keywords": ["kw1", "kw2", "kw3"], "intent": "Hvad søgeren vil have"}`
      : `You are an SEO strategist for NemtBudget.nu — a Danish personal finance site with an English section for expats and international residents.

Existing English articles:
${existingTitles}

${discoveredKws ? `Google Search Console discovered these keywords with traffic: ${discoveredKws}` : ""}

Generate ONE new article topic about personal finance in Denmark for English speakers that:
- Does NOT overlap with existing articles
- Has high search intent (people want a specific answer)
- Is relevant for expats, international workers, or English-speaking residents in Denmark in 2026
- Focuses on topics where the Danish system differs from other countries
${discoveredKws ? "- Prioritize topics matching the discovered keywords" : ""}

Return ONLY valid JSON:
{"slug": "url-friendly-slug", "title": "Article Title", "category": "Category", "keywords": ["kw1", "kw2", "kw3"], "intent": "What the searcher wants"}`;

    const topicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": anthropicKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [{ role: "user", content: topicPrompt }],
      }),
    });

    if (!topicRes.ok) throw new Error(`Topic generation failed (${locale}): ${await topicRes.text()}`);

    const topicData = await topicRes.json();
    const topicRaw = topicData.content[0].text as string;
    const jsonMatch = topicRaw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`Could not parse topic JSON from AI (${locale})`);

    const generated = JSON.parse(jsonMatch[0]) as {
      slug: string; title: string; category: string; keywords: string[]; intent: string;
    };

    if (used.has(generated.slug)) {
      generated.slug = generated.slug + "-" + Date.now().toString(36).slice(-4);
    }

    topic = generated;

    if (discovered?.length) {
      for (const d of discovered) {
        await supabase
          .from("seo_discovered_keywords")
          .update({ status: "queued" })
          .eq("keyword", d.keyword);
      }
    }

    console.log(`✓ Auto-generated topic (${locale}): "${topic.title}" (slug: ${topic.slug})`);
  }

  return topic;
}
