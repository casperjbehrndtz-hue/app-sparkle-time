import { useParams, Link, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { AppFooter } from "@/components/AppFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

// ─── Static fallback articles ─────────────────────────────────────────────────
const STATIC_ARTICLES: Record<string, { title: string; category: string; readTime: string; content: string }> = {
  "hvad-koster-det-at-bo-i-koebenhavn": {
    title: "Hvad koster det at bo i København i 2026?",
    category: "Boligøkonomi",
    readTime: "8 min",
    content: `
## Gennemsnitlige udgifter i København

At bo i København er dyrt — men hvor dyrt? Vi har samlet de nyeste tal fra Danmarks Statistik og Boliga.dk for at give dig et realistisk billede af, hvad det faktisk koster at leve i hovedstaden i 2026.

Mange flytter til København uden et klart overblik over de samlede udgifter. Det kan hurtigt føre til et negativt rådighedsbeløb og en opsparing der aldrig vokser. Denne guide giver dig de konkrete tal, bydel for bydel.

### Husleje — den største post

Husleje er langt den største udgift for de fleste københavnere. En gennemsnitlig 2-værelses lejlighed koster **12.000–16.000 kr./md.** i leje. Andelsboliger er typisk billigere i månedlig ydelse, men kræver en større kontant indskud — ofte 200.000–500.000 kr.

Priserne varierer kraftigt afhængigt af bydel:

- **Indre by / Frederiksberg:** 15.000–20.000 kr./md. De dyreste områder, men tæt på alt.
- **Østerbro / Nørrebro:** 12.000–16.000 kr./md. Populære bydele med god infrastruktur.
- **Amager / Valby:** 9.000–13.000 kr./md. Mere overkommeligt, stadig god forbindelse til centrum.
- **Nordvest / Bispebjerg:** 9.000–12.000 kr./md. Stigende i popularitet, lavere startpris.
- **Vanløse / Brønshøj:** 8.500–11.500 kr./md. Roligere områder med mere plads.

**Tommelfingerregel:** Boligudgifter bør ikke overstige **33% af din bruttoindkomst**. Tjener du 35.000 kr./md. brutto, bør din husleje altså holdes under ca. 11.500 kr.

### Forsyninger og ejerudgifter

Ud over selve huslejen kommer der typisk:

- **El og varme:** 800–1.500 kr./md. (afhængig af boligstørrelse og isolering)
- **Vand:** Ofte inkluderet i husleje, ellers 200–400 kr./md.
- **Internet:** 250–350 kr./md. for fiber
- **Husforsikring (indbo):** 150–300 kr./md.

For ejere skal du desuden regne med ejendomsskat, vedligeholdelse og evt. fællesudgifter — typisk 2.000–4.000 kr./md. ekstra.

### Transport

En månedlig Rejsekort Pendler koster **430 kr.** for zoner 1-2. Skal du længere ud, stiger prisen hurtigt:

- **Zone 1-4 (fx Amager til Lyngby):** 790 kr./md.
- **Zone 1-6 (fx centrum til Ballerup):** 1.080 kr./md.

Har du cykel, kan du spare det meste. København har over 380 km cykelsti, og 62% af københavnerne cykler til arbejde. En god pendlercykel koster 3.000–8.000 kr. og betaler sig selv hjem på få måneder.

Har du bil, skal du regne med parkering (500–1.200 kr./md. for beboerlicens afhængig af zone), benzin, forsikring og vægtafgift — samlet ofte 3.000–5.000 kr./md.

### Dagligvarer og mad

En enkelt person bruger typisk **3.000–4.500 kr./md.** på mad i København. Et par bruger **5.000–7.000 kr./md.**

Prisen afhænger stærkt af dine vaner:

- **Discount (Netto, Rema 1000, Lidl):** ca. 2.500–3.500 kr./md. per person
- **Supermarked (Føtex, Irma, Meny):** ca. 3.500–5.000 kr./md. per person
- **Med takeaway/restaurants 2x ugen:** Tillæg 1.500–3.000 kr./md.

**Sparetip:** Madspildsapper som Too Good To Go kan spare 200–400 kr./md. Planlæg dine måltider søndag og hold dig til en indkøbsliste.

### Sundhed og forsikring

- **Sundhedsforsikring (via arbejde):** Ofte gratis
- **Privat sundhedsforsikring:** 200–400 kr./md.
- **Tandlæge:** Gennemsnitligt 2.000–4.000 kr./år (ikke dækket af det offentlige for voksne)
- **Fitnesscenter:** 200–400 kr./md.

### Underholdning og fritid

- **Streaming (Netflix + Spotify):** 260 kr./md.
- **Kaffe ude (3x/uge):** ~500 kr./md.
- **Restaurant/bar (2x/md.):** 600–1.200 kr./md.
- **Kultur (biograf, museum):** 200–400 kr./md.

### Samlet overblik for en person

| Post | Beløb/md. |
|------|-----------|
| Husleje (2-vær, Nørrebro) | 13.500 kr. |
| Forsyninger (el, varme, internet) | 1.200 kr. |
| Dagligvarer | 3.500 kr. |
| Transport (Rejsekort) | 430 kr. |
| Telefon | 150 kr. |
| Forsikringer (indbo + ulykke) | 450 kr. |
| Streaming og abonnementer | 350 kr. |
| Fritid og underholdning | 800 kr. |
| Tandlæge (fordelt) | 250 kr. |
| **Total faste + variable** | **~20.630 kr.** |

Det betyder, at du som minimum skal have en nettoløn på **20.630 kr./md.** bare for at gå i nul — uden opsparing, uforudsete udgifter eller ferie.

### Hvad har du til overs?

Det vigtigste tal i dit budget er **rådighedsbeløbet** — det du har til overs efter alle udgifter. Det er forskellen mellem økonomisk stress og økonomisk frihed.

Vil du se præcis hvad du har til overs med dine specifikke tal? Brug NemtBudgets gratis beregner — den tager højde for din kommune, din skat og dine faktiske udgifter. Det tager 3 minutter.
    `,
  },
  "spar-penge-paa-abonnementer": {
    title: "Sådan sparer du 3.000 kr./år på abonnementer",
    category: "Besparelser",
    readTime: "7 min",
    content: `
## Danskernes abonnementsfælde

Den gennemsnitlige dansker betaler for **4-6 streaming- og abonnementstjenester** — men bruger kun halvdelen aktivt. Dertil kommer nyhedsapps, fitnessapps, cloud-opbevaring og diverse "gratis prøveperioder" der blev glemt. Det er ikke ualmindeligt at bruge 500-800 kr./md. på abonnementer uden at tænke over det.

Den gode nyhed: Det er en af de nemmeste steder at spare penge. Ingen livsstilsændring — bare en times oprydning.

### Hvad betaler danskerne for?

Her er de mest almindelige abonnementer og deres 2026-priser:

**Streaming:**
- Netflix Standard: 149 kr./md.
- Disney+: 99 kr./md.
- HBO Max: 99 kr./md.
- Viaplay: 139 kr./md.
- Amazon Prime Video: 89 kr./md.
- Apple TV+: 79 kr./md.

**Musik:**
- Spotify Premium: 109 kr./md.
- Apple Music: 109 kr./md.
- YouTube Premium: 129 kr./md.

**Nyheder og medier:**
- Berlingske/Politiken/JP digitalt: 99-199 kr./md.
- Zetland: 129 kr./md.

**Diverse:**
- iCloud+ / Google One: 15-79 kr./md.
- Headspace / Calm: 69-89 kr./md.
- Fitness-app (Strava, MyFitnessPal): 50-99 kr./md.

Har du bare 5 af ovenstående, bruger du hurtigt **500+ kr./md.** — det er **6.000 kr./år**.

### Trin 1: Kortlæg alle dine abonnementer

Gennemgå dine kontoudtog for de seneste 3 måneder. Brug din netbank eller MobilePay oversigt og list alle tilbagevendende betalinger. De fleste finder 2-3 de har glemt.

**Tjekliste for steder at kigge:**
- Kontoudtog (kort og konto)
- App Store / Google Play abonnementer
- PayPal tilbagevendende betalinger
- MobilePay aftaler

Skriv alle ned med navn og månedlig pris. Mange bliver overraskede over totalen.

### Trin 2: Kategoriser og prioritér

Del dine abonnementer i tre grupper:

- **Bruger dagligt:** Behold disse. De giver reel værdi.
- **Bruger af og til:** Overvej at pause eller dele med andre.
- **Bruger sjældent/aldrig:** Opsig med det samme.

Vær ærlig. Hvis du ikke har brugt Netflix de seneste 2 uger, har du sandsynligvis ikke brug for det lige nu. Du kan altid oprette det igen — det tager 2 minutter.

### Trin 3: Del abonnementer

Mange streamingtjenester tillader flere profiler på ét abonnement:

- **Netflix Standard:** 2 samtidige brugere
- **Spotify Family:** Op til 6 brugere for 179 kr./md. (30 kr./person)
- **Apple One Family:** 195 kr./md. for iCloud, Music, TV+ og Arcade for 6 personer
- **Disney+:** 4 samtidige streams

Del med partner, familie eller venner. En Spotify Family-plan delt med 5 andre koster 30 kr./md. i stedet for 109 kr./md. — en besparelse på 948 kr./år bare på musik.

### Trin 4: Brug studenterabonnementer og bundling

Mange tjenester tilbyder studentepriser til halv pris — også for voksenstuderende og efteruddannelse:

- Spotify Student: 59 kr./md. (inkl. Hulu i nogle lande)
- Apple Music Student: 59 kr./md.
- Amazon Prime Student: halveret pris

Tjek også om din bank, fagforening eller forsikring giver rabat. Danske Bank, Nordea og flere tilbyder fordele via deres kundeportaler.

### Trin 5: Rotér i stedet for at stable

I stedet for at have 4 streamingtjenester samtidig, kan du rotere: Netflix i 2 måneder, så HBO i 2 måneder, så Disney+ i 2. Du ser det samme indhold — men betaler for én ad gangen.

Besparelse: Fra 450 kr./md. (3 tjenester) til 150 kr./md. (1 ad gangen) = **3.600 kr./år**.

### Potentiel samlet besparelse

| Handling | Besparelse/år |
|----------|---------------|
| Opsig 2 ubrugte abonnementer | 2.400 kr. |
| Del Spotify Family (6 pers.) | 948 kr. |
| Rotér streaming i stedet for at stable | 2.400 kr. |
| Skift til studenterpris (1 tjeneste) | 600 kr. |
| **Samlet potentiale** | **3.000–6.000 kr.** |

Det svarer til en weekend i Berlin, en ekstra måneds opsparing eller 50 kr. mere i rådighedsbeløb hver eneste dag.

### Hold styr på det fremover

Når du har ryddet op, sæt en påmindelse i kalenderen om 3 måneder. Abonnementer har det med at snige sig ind igen — en gratis prøveperiode her, en impulsiv tilmelding der.

Brug NemtBudgets abonnementssporing til at holde et løbende overblik over dine faste udgifter. Det hele samles ét sted, så du aldrig betaler for noget du ikke bruger.
    `,
  },
  "budget-for-par": {
    title: "Budgetguide for par: Fælles eller adskilte konti?",
    category: "Parøkonomi",
    readTime: "9 min",
    content: `
## Penge og kærlighed

73% af danske par er uenige om økonomi på et tidspunkt. Det er ikke et tegn på problemer — det er helt normalt. Penge er det emne, par skændes mest om, ifølge dansk forskning.

Spørgsmålet er ikke om I bliver uenige. Spørgsmålet er, om I har en struktur der gør det let at blive enige igen. Og det starter med at vælge den rigtige kontomodel.

### Hvorfor struktur er vigtigere end vilje

De fleste par starter med gode intentioner: "Vi deler bare alt ligeligt." Men i praksis tjener de fleste par ikke det samme. Den ene har måske højere løn men lavere forbrug. Den anden køber dyrere tøj men betaler mindre i transport.

Uden en klar aftale opstår der hurtigt skjult frustration. En god kontostruktur fjerner de fleste af de daglige diskussioner.

### Model 1: Fælles konto til alt

Begge parter sætter alle penge ind på én fælles konto. Alt betales derfra — både faste udgifter og personligt forbrug.

**Fordele:**
- Enkelt — kun én konto at holde øje med
- Fuld gennemsigtighed
- Følelse af fællesskab og fælles mål

**Ulemper:**
- Kan skabe konflikter hvis I har forskellig forbrugsadfærd
- Den ene kan føle sig overvåget
- Svært med overraskelser (gaver, personlige indkøb)

**Passer til:** Par med nogenlunde samme indkomst, samme forbrugsvaner og en høj grad af tillid.

**Praktisk opsætning:** Opret en fælles lønkonto i banken. Begge lønninger går ind. Sæt en fast månedlig overførsel til en fælles opsparingskonto.

### Model 2: Fælles konto til faste udgifter + personlige konti

Den mest populære model i Danmark. I har hver jeres personlige konto plus en fælles konto til husleje, mad, forsikringer og andre faste udgifter.

**Fordele:**
- Personlig frihed — "mine penge" og "vores penge" er adskilte
- Fælles ansvar for husholdningen
- Ingen diskussion om personlige køb

**Ulemper:**
- Kræver en klar aftale om hvem betaler hvad ind
- Skal genforhandles hvis indkomst ændrer sig

**Passer til:** De fleste par. Denne model er fleksibel nok til at fungere både for par med ens og uens indkomst.

**Praktisk opsætning:**
- Kortlæg alle fælles udgifter (husleje, mad, forsikringer, streaming, fælles opsparing)
- Beslut om I deler 50/50 eller proportionalt efter indkomst
- Sæt automatisk overførsel op til fælles konto den 1. hver måned
- Resten er jeres egne penge — ingen spørgsmål stillet

**Eksempel med proportional fordeling:**

| | Person A | Person B |
|--|----------|----------|
| Nettoløn | 28.000 kr. | 22.000 kr. |
| Andel af samlet | 56% | 44% |
| Fælles udgifter (25.000 kr.) | 14.000 kr. | 11.000 kr. |
| Personligt til overs | 14.000 kr. | 11.000 kr. |

### Model 3: Adskilte konti med overførsler

Alle har sin egen konto. Udgifter deles løbende — typisk via MobilePay eller overførsler.

**Fordele:**
- Maksimal personlig frihed og uafhængighed
- Godt for par der har været sammen kort tid
- Simpelt ved brud

**Ulemper:**
- Administrativt besværligt ("kan du overføre for din halvdel af maden?")
- Kan skabe en transaktionel følelse i forholdet
- Svært at spare op sammen

**Passer til:** Nye par, par med meget forskellig indkomst eller livsstil, eller par der værdsætter økonomisk uafhængighed.

### Hvornår skal I genforhandle?

Jeres kontomodel bør genbesøges ved store livsændringer:

- **Nyt job / lønændring:** Fordeling bør justeres
- **Barn på vej:** Nye fælles udgifter, evt. barsel med lavere indkomst
- **Boligkøb:** Større fælles forpligtelser
- **Gæld:** Hvis den ene har studielån, bør I aftale om det påvirker fordelingen

Sæt en årlig "pengesnak" i kalenderen — fx i januar. 30 minutter hvor I gennemgår jeres fælles økonomi, justerer fordelingen og sætter nye mål.

### Den svære samtale: sådan starter I

Mange undgår samtalen fordi den føles akavet. Her er en nem struktur:

- **Fakta først:** "Vores fælles udgifter er X kr./md. Min nettoløn er Y, din er Z."
- **Model:** "Skal vi dele 50/50 eller proportionalt?"
- **Personligt:** "Hvor meget vil vi hver have som frie penge?"
- **Mål:** "Hvad sparer vi op til? Hvornår?"

Start med tal, ikke følelser. Det er nemmere at blive enige om matematik end om retfærdighed.

### Hvad anbefaler vi?

Model 2 fungerer for de fleste danske par. Den giver fællesskab om det vigtige (bolig, mad, opsparing) og frihed om det personlige (tøj, gaver, hobbyer).

Sæt et fast beløb ind på fælles konto til hushold — og behold resten som personlige penge uden at skulle spørge om lov.

Brug NemtBudgets beregner med "par" valgt til at se jeres samlede rådighedsbeløb. Eller prøv ParFinans.dk for en dybere gennemgang af jeres fælles økonomi.
    `,
  },
  "foerste-budget-guide": {
    title: "Dit første budget: En komplet begynderguide",
    category: "Kom i gang",
    readTime: "10 min",
    content: `
## Du behøver ikke et regneark

Mange tror et budget kræver timer med Excel, komplicerede formler og bogføring. Det gør det ikke. Et simpelt budget kan laves på 15 minutter — og det kan ændre din økonomi fundamentalt.

Et budget er ikke en begrænsning. Det er et værktøj der giver dig kontrol. Når du ved hvad du har til overs, kan du bruge pengene med god samvittighed i stedet for at gætte og bekymre dig.

### Hvad er et budget egentlig?

Et budget er bare svaret på ét spørgsmål: **"Hvad har jeg til overs hver måned?"**

Formlen er enkel:

**Indkomst − udgifter = rådighedsbeløb**

Dit rådighedsbeløb er det vigtigste tal i din økonomi. Det er den buffer der afgør om du kan spare op, håndtere uforudsete udgifter eller om du langsomt glider ind i overtræk.

### Trin 1: Find din indkomst efter skat

Start med det beløb der lander på din konto hver måned — din **nettoløn**. Det er din løn efter skat, AM-bidrag og pension er trukket.

Tjek din seneste lønseddel eller netbank. Beløbet varierer måske lidt fra måned til måned (pga. ferietillæg, overarbejde el.lign.) — tag gennemsnittet af de seneste 3 måneder.

Har du andre indkomstkilder, læg dem til:
- **SU:** 6.397 kr./md. (udeboende, 2026-sats)
- **Boligstøtte:** Varierer — tjek borger.dk
- **Freelance/bijob:** Tag gennemsnittet over 3 måneder
- **Børnepenge:** 1.606 kr./kvartal per barn (0-2 år)

### Trin 2: Kortlæg dine faste udgifter

Faste udgifter er dem der er (nogenlunde) ens hver måned. De er nemme at kortlægge, fordi de er forudsigelige:

**Bolig:**
- Husleje / boligydelse
- El og varme
- Vand (hvis separat)
- Internet

**Transport:**
- Månedskort / Rejsekort
- Billån + forsikring + benzin
- Parkering

**Forsikringer:**
- Indboforsikring
- Ulykkesforsikring
- Bilforsikring
- Evt. sundhedsforsikring

**Abonnementer:**
- Telefon
- Streaming (Netflix, Spotify etc.)
- Fitness
- Apps og tjenester

**Gæld:**
- Studielån (afdrag)
- Forbrugslån
- Kreditkort (minimumsbetaling)

Skriv alle dine faste udgifter ned og summer dem. For de fleste danskere ligger de faste udgifter på **12.000–18.000 kr./md.** for en enlig og **18.000–28.000 kr./md.** for et par.

### Trin 3: Estimer de variable udgifter

Variable udgifter skifter fra måned til måned. De er sværere at sætte tal på, men desto vigtigere at forstå — det er typisk her de usynlige pengesluger gemmer sig.

**Mad og dagligvarer:**
- Typisk den største variable post: 3.000–5.000 kr./md. per person
- Kig i netbanken og tag gennemsnittet

**Restauranter og takeaway:**
- Danskere bruger gennemsnitligt 1.200 kr./md. på udespisning
- Mange undervurderer denne post kraftigt

**Tøj og personlig pleje:**
- Typisk 500–1.500 kr./md.
- Varierer meget — kig i kontoudtoget

**Fritid og underholdning:**
- Biograf, koncerter, hobbyer
- Typisk 500–1.000 kr./md.

**Diverse og uforudsete:**
- Gaver, reparationer, medicin
- Regn med 500–1.000 kr./md. som buffer

**Tip:** Kig i din netbank på de seneste 3 måneder. Kategorisér alle transaktioner. Det tager 15-20 minutter, men giver dig det mest ærlige billede.

### Trin 4: Beregn dit rådighedsbeløb

Nu kan du lave beregningen:

**Nettoindkomst − (faste udgifter + variable udgifter) = rådighedsbeløb**

**Eksempel:**

| Post | Beløb/md. |
|------|-----------|
| Nettoløn | 25.000 kr. |
| Faste udgifter | -14.500 kr. |
| Variable udgifter | -6.500 kr. |
| **Rådighedsbeløb** | **4.000 kr.** |

Er det positivt? Godt — du har noget at spare op af. Er det negativt eller tæt på nul? Så er der noget at arbejde med, men nu ved du det i det mindste.

### Trin 5: Sæt et mål for dit rådighedsbeløb

Når du kender dit rådighedsbeløb, beslut hvad du vil bruge det til. Prioriter i denne rækkefølge:

**1. Nødbuffer (første prioritet)**
- Mål: 3 måneders udgifter i reserve (typisk 30.000–50.000 kr.)
- Beskytter dig mod uforudsete udgifter: tandlæge, reparationer, arbejdsløshed
- Sæt et fast beløb til side hver måned indtil bufferen er fyldt

**2. Gældsnedbringelse**
- Betal ekstra af på dyreste lån først (højeste rente)
- Studielån har typisk lav rente — prioritér forbrugslån og kreditkort højere
- Bare 500 kr./md. ekstra på et forbrugslån kan spare tusindvis i renter

**3. Opsparing og investering**
- Tommelfingerregel: Spar 10-20% af din nettoindkomst
- Start med hvad du kan — selv 500 kr./md. gør en forskel over tid
- Overvej en aktiesparekonto (beskattes lavere end frie midler)

### De 3 mest almindelige fejl

**Fejl 1: Glemme årsudgifter**
Licens, forsikringer der betales årligt, værkstedsregning. Fordel dem over 12 måneder så de ikke overrasker dig.

**Fejl 2: Undervurdere variable udgifter**
De fleste tror de bruger 2.000 kr./md. på mad. I virkeligheden er det ofte 3.500-4.500 kr. Brug kontoudtoget — ikke din mavefornemmelse.

**Fejl 3: Lave et budget og aldrig kigge på det igen**
Et budget er kun nyttigt hvis du tjekker det regelmæssigt. Sæt en månedlig påmindelse — 5 minutter er nok til at se om du er på sporet.

### Brug NemtBudget

Det nemmeste er at lade NemtBudget beregne det hele for dig. Svar på 6 spørgsmål og få dit præcise rådighedsbeløb på 3 minutter — gratis og privat. Din data gemmes kun lokalt på din enhed.
    `,
  },
};

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} className="font-display font-bold text-xl mt-8 mb-3">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="font-semibold text-base mt-6 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold my-1">{line.slice(2, -2)}</p>;
    if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm text-muted-foreground list-disc">{line.slice(2)}</li>;
    if (line.startsWith("| ") && line.includes("|")) {
      const cells = line.split("|").filter(Boolean).map(c => c.trim());
      return <tr key={i}>{cells.map((c, j) => <td key={j} className="border border-border px-3 py-1.5 text-sm">{c.replace(/\*\*/g, "")}</td>)}</tr>;
    }
    if (line.trim() === "") return <br key={i} />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    if (parts.length > 1) return <p key={i} className="text-sm text-foreground/80 leading-relaxed my-1">{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
    return <p key={i} className="text-sm text-foreground/80 leading-relaxed my-1">{line}</p>;
  });
}

export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  const config = useWhiteLabel();
  const { t } = useI18n();
  const [article, setArticle] = useState<{ title: string; category: string; readTime: string; content: string } | null | "loading">("loading");

  useEffect(() => {
    if (!slug) { setArticle(null); return; }

    // Supabase is primary — static articles are fallback only
    supabase
      .from("articles")
      .select("title, category, read_time, content")
      .eq("slug", slug)
      .eq("status", "published")
      .single()
      .then(({ data }) => {
        if (data) {
          setArticle({ title: data.title, category: data.category, readTime: data.read_time, content: data.content });
        } else {
          // Not in DB — try static fallback
          setArticle(STATIC_ARTICLES[slug] ?? null);
        }
      })
      .catch(() => {
        // DB unreachable — try static fallback
        setArticle(STATIC_ARTICLES[slug] ?? null);
      });
  }, [slug]);

  const title = article && article !== "loading" ? article.title : "";
  const content = article && article !== "loading" ? article.content : "";
  const description = content ? content.slice(0, 155).replace(/[#\n*|]/g, "").trim() : "Læs guides om dansk privatøkonomi.";
  const canonicalUrl = `https://nemtbudget.nu/guides/${slug}`;

  usePageMeta({
    title: title ? `${title} — NemtBudget` : "Guide — NemtBudget",
    description,
    path: `/guides/${slug}`,
    jsonLd: title ? {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "description": description,
      "url": canonicalUrl,
      "inLanguage": "da",
      "publisher": {
        "@type": "Organization",
        "name": "NemtBudget",
        "url": "https://nemtbudget.nu",
      },
    } : undefined,
  });

  if (article === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!article) return <Navigate to="/guides" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/guides" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("article.guides")}
          </Link>
          <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">{article.category}</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <p className="text-xs text-muted-foreground mb-3">{article.readTime} {t("blog.readTime")}</p>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground mb-8 leading-tight">{article.title}</h1>
        <div className="prose-content space-y-1">
          {renderContent(article.content)}
        </div>

        <div className="mt-12 rounded-2xl bg-primary p-6 text-center">
          <h3 className="font-display font-bold text-lg text-primary-foreground mb-2">{t("article.ctaTitle")}</h3>
          <p className="text-primary-foreground/70 text-sm mb-4">{t("article.ctaSubtitle")}</p>
          <Link to="/" className="inline-block px-6 py-3 rounded-xl bg-background text-foreground font-semibold text-sm hover:bg-background/90 transition-colors">
            {t("article.ctaButton").replace("{brand}", config.brandName)}
          </Link>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
