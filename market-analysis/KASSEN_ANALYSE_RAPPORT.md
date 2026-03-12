# KASSEN - Dybdegaaende Produkt- og Markedsanalyse

**Dato:** 12. marts 2026
**Produkt:** Kassen - Danmarks nemmeste budgetvaerktoj
**URL:** https://app-sparkle-time.vercel.app
**Analyseret af:** Virtuelt strategihold (CEO, Forretningsudvikler, Outsourcing Ekspert, Produktudvikler, Software Ingenior, Markedsfoeringsekspert)

---

## DEL 1: PRODUKTGENNEMGANG

### Hvad Kassen er i dag

Kassen er et dansk, webbaseret budgetvaerktoj bygget som en PWA (Progressive Web App). Brugeren gennemgaar en onboarding paa 5 trin (husstand, indkomst, bolig, born, udgifter) og faar derefter et dashboard med:

- **Cockpit:** Health score (0-100), raedighedsbelob, smart steps
- **Overblik:** Sankey-diagram, cirkeldiagrammer, inline charts
- **Handling:** Optimeringsforslag med konkrete besparelser i kr./md.
- **Fremtid:** Fremskrivninger og projektioner
- **Avanceret:** Hvad-hvis scenarie, stresstest, aarshjul, abonnement-tracker, nabosammenligning, historik, par-split

Plus en AI-chatpanel (Claude Haiku 4.5 via Supabase Edge Function) der analyserer brugerens oekonomi.

### Hvad vi observerede

**Landing page:** Professionel, mork navy hero med klart CTA ("Beregn dit raedighedsbelob"). Trust badges ("Bygget til dansk finanslovgivning", "3 minutter", "100% privat"). Tre testimonials. Statistikker: "3 min", "2.400 kr. gennemsnit besparelse/md.", "100% privat & gratis". Feature-kort med AI-indsigt, sammenligning, bankrapport. Godt CTA i bunden.

**Onboarding:** Rent, mobiloptimeret flow med step-indikator. Starter med husstandsvalg (solo/par), derefter indkomst-slider, boligtype med postnummer-opslag der pre-fylder estimater fra prisdatabase, born med bornepengeberegner, udgifter med detaljerede toggles for streaming, transport, forsikring, mm. Live budgetbar i bunden viser raedighedsbelob i realtid. AI-kommentarer undervejs.

**Auth/Login side:** Giver 404. VIGTIG BUG: Login-siden er routed til /login i koden, men Auth-komponenten er mappe-til /login, ikke /auth. Blog/guides-siden giver ogsaa 404 (route er /guides, ikke /blog).

**Privacy side:** Velskrevet dansk privatlivspolitik, GDPR-compliant, klar kommunikation om lokalt datalager.

**Install side:** Minimal PWA-installationsside.

---

## DEL 2: KONKURRENTANALYSE

### 1. Spiir (spiir.dk)
- **Hvad:** Danmarks stoerste budgetapp, 400.000+ brugere. Ejet af Lunar/Mastercard
- **Features:** Automatisk bankintegration, 80+ kategorier, challenges/sparemaal, kvitteringsscanning, quiz om pengevaner
- **Pris:** Gratis
- **Svaghed:** Ingen AI-raadgivning, ingen hvad-hvis analyse, ingen white-label. Kraever bankkobling - kan ikke bruges anonymt. Kun mobil (iOS/Android)
- **Kassens fordel:** Privacy-first (ingen bankkobling nodvendig), AI-raadgivning, web-baseret, white-label klar

### 2. Lunar (lunar.app)
- **Hvad:** Dansk neobank med budgetfunktioner. Ejer Spiir
- **Features:** Fuld bankfunktionalitet, budgetopsaetning, automatisk opsparing, delt konto, laan op til 500.000 kr.
- **Pris:** Light (gratis) til Unlimited (betalt). Budgetfunktioner i alle planer
- **Svaghed:** Du SKAL vaere Lunar-kunde. Budgetfunktionen er sekundaer til bankproduktet. Ingen AI-analyse. Laast oekosystem
- **Kassens fordel:** Bank-agnostisk, dybere budgetanalyse, AI, white-label til andre banker

### 3. Mybanker.dk
- **Hvad:** Sammenligningsportal for bank- og forsikringsprodukter. 80% af dansk bankmarkeds brands
- **Features:** Sammenlign laan, bank-skift service, budgetmaaltemplates
- **Pris:** Gratis for forbrugere (banker betaler for leads)
- **Svaghed:** Ikke et budgetvaerktoj - det er en lead-generator. Ingen personlig raadgivning. Ingen AI
- **Kassens fordel:** Kassen er et vaerktoj, ikke en portal. Dybere personlig analyse. Kunne integrere med Mybanker for leads

### 4. Norm Invest (norminvest.com)
- **Hvad:** Dansk robo-investor, automatisk investering i ETF'er
- **Features:** 5-min investeringsplan, automatisk maanedsopsparing, skatteindberetning
- **Pris:** 0.60-0.80% aarligt forvaltningsgebyr
- **Svaghed:** KUN investering - intet budgetvaerktoj. Du maa selv finde ud af hvad du har raad til at investere
- **Kassens fordel:** Kassen beregner foerst hvad du har til overs, DEREFTER kan du investere. Naturlig partner, ikke konkurrent

### 5. Copilot Money (copilot.money)
- **Hvad:** Premium budgetapp for Apple-oekosystem. "Bedste design" i kategorien
- **Features:** Banksynkronisering, AI-kategorisering, adaptive budgets, abonnement-tracking, net worth tracking
- **Pris:** $13/md. eller $95/aar
- **Svaghed:** Kun Apple (iOS/Mac). Ingen dansk bankintegration. Amerikansk fokus. Dyrt
- **Kassens fordel:** Dansk kontekst (bornecheck, rentefradrag, danske priser), gratis, web-baseret, alle platforme

### 6. YNAB (youneedabudget.com)
- **Hvad:** International markedslederen. Zero-based budgeting metode
- **Features:** Fuld banksynk, maalssaetning, laaneplanner, familie-deling (6 pers.), "Cost To Be Me"
- **Pris:** $14.99/md. eller $109/aar. 34 dages gratis proeve
- **Svaghed:** Amerikanskinspireret - passer ikke 1:1 til dansk oekonomisk kontekst. Dyrt. Kraever engagement og laering. Ingen dansk bankintegration
- **Kassens fordel:** 3 minutter vs. ugers laering. Gratis. Dansk kontekst med rentefradrag, bornecheck, danske prisestimater

### 7. Cleo / Cent Capital (AI-finance apps UK)
- **Hvad:** AI-chatbot-baserede budgetapps med Open Banking i UK
- **Features:** AI-chatbot der svarer paa oekonomi-sporgsmal, automatisk kategorisering, spareraad
- **Pris:** Freemium (basis gratis, premium ~$6/md.)
- **Svaghed:** UK-fokus, ingen dansk support, kraever bankkobling
- **Kassens fordel:** Kassen har AI OG struktureret budgetanalyse. Dansk. Ingen bankkobling nodvendig

### Opsummering: Konkurrentlandskab

| Feature | Kassen | Spiir | Lunar | YNAB | Copilot |
|---------|--------|-------|-------|------|---------|
| Dansk kontekst | Ja | Ja | Ja | Nej | Nej |
| Gratis | Ja | Ja | Delvist | Nej | Nej |
| AI-raadgivning | Ja | Nej | Nej | Nej | Delvist |
| Bankkobling nodvendig | Nej | Ja | Ja | Nej | Ja |
| Hvad-hvis analyse | Ja | Nej | Nej | Nej | Nej |
| White-label klar | Ja | Nej | Nej | Nej | Nej |
| 3-min setup | Ja | Nej | Nej | Nej | Nej |
| Web-baseret | Ja | Nej | Nej | Ja | Nej |

---

## DEL 3: HOLDETS RAPPORT

---

### CEO - Strategisk vurdering

**Er produktet klar til lancering?**

Nej, men det er taet paa. Produktet er funktionelt imponerende for et tidligt stadie - onboarding er smooth, dashboardet er rigt, AI-integrationen virker, og white-label-infrastrukturen er allerede bygget. Men der er blokkerende problemer:

1. **Login-siden giver 404.** Det er en showstopper. Brugere der klikker "Log ind" rammer en doed vaeg. Routes i koden peger paa /login, men det ser ud til at Vercel/SPA routing ikke haandterer det korrekt, eller Auth-komponenten ikke er korrekt mapped.

2. **Blog/Guides giver ogsaa 404.** Footeren linker til "Guides & tips" som ikke virker.

3. **Ingen reel social proof.** Testimonials er fabrikkerede ("Line, 34 fra Aarhus"). Det er fint til MVP, men det skal vaere aecrligt eller fjernes foer lancering.

4. **"2.400 kr. gns. besparelse/md." paastanden er udokumenteret.** Det er en aggressiv claim der kan underminere tillid hvis den ikke kan bakkes op.

**Stoerste risiko:**
At positionere sig som "endnu en gratis budgetapp" i et marked hvor Spiir allerede er gratis og har 400.000 brugere med bankintegration. Hvis Kassen ikke finder en tydelig differentiering, drukner den.

**Stoerste mulighed:**
White-label B2B-salg til danske banker og finansielle institutioner. Koden har ALLEREDE Nordea- og Danske Bank-konfigurationer klar. Ingen andre danske budgetvaerktoejer tilbyder dette. En enkelt bankaftale kan vaere vaerd 500.000-2.000.000 kr./aar.

**3 vigtigste beslutninger nu:**

1. **Vaelg primaer forretningsmodel: B2B white-label FOERST, B2C DERNAEST.** B2C kraever massiv markedsfoering. B2B kraever 3-5 gode salgsmoeder. Start der pengene er.

2. **Fiks de 404-fejl og fjern falske testimonials inden nogen ser produktet.** En potentiel B2B-partner der tester linket og ser 404 paa login, gaar videre.

3. **Byg en demo-mode der viser dashboardet med sample-data**, saa potentielle partnere kan se vaerdien uden at gennemgaa onboarding. Saelgere kan ikke bede en bankdirektoer om at taste sin indkomst ind.

---

### Senior Forretningsudvikler - Forretningsmodel & B2B/B2C

**Hvordan tjener vi penge?**

Der er tre realistiske modeller, og jeg anbefaler at koere to parallelt:

**Model 1: B2B White-Label SaaS (PRIMAER)**

Kassen har allerede white-label infrastruktur med Nordea og Danske Bank demo-configs. Det er en enorm fordel.

- **Kunder:** Danske banker (Nordea, Danske Bank, Jyske Bank, Sydbank, Nykredit, Arbejdernes Landsbank), pensionskasser (PFA, Danica, AP Pension), forsikringsselskaber
- **Vaerdipropositionen:** "Giv jeres kunder et AI-drevet budgetvaerktoj under jeres eget brand. Oeg engagement, reducer churn, generer leads til boliglaan/forsikring/investering. Ingen udvikling paakraevet - vi haandterer alt."
- **Prisforslag:**
  - Setup fee: 50.000-150.000 kr. (tilpasning, integration, design)
  - Maanedlig licens: 15.000-50.000 kr./md. afhaeongigt af brugervolumen
  - Per-lead fee: 25-100 kr. per kvalificeret lead (f.eks. bruger der klikker "Tal med raadgiver")
- **Estimeret ARR ved 3 bank-kunder:** 1.000.000 - 2.500.000 kr./aar

**Model 2: B2C Freemium (SEKUNDAER)**

- **Gratis tier:** Alt hvad der er nu (onboarding, dashboard, basis-optimering)
- **Premium tier (49-79 kr./md.):**
  - Ubegraaenset AI-chat (gratis tier: 5 sporgsmal/md.)
  - Avancerede scenarier (stresstest, aarshjul)
  - Historisk tracking med grafer over tid
  - PDF budgetrapport til banken
  - Par-split analyse
  - Push-notifikationer (naar rente aendres, nye besparelsesmuligheder)
- **Estimeret konvertering:** 2-5% af gratisbrugere. Ved 10.000 brugere = 200-500 betalende = 10.000-40.000 kr./md.

**Model 3: Affiliate/Lead-gen (SUPPLERENDE)**

Kassens optimeringsforslag linker allerede til Oister, Forsikringsguiden, Parfinans etc. Disse links kan monetiseres:
- Mobilskift: 50-150 kr./konvertering
- Forsikringsskift: 200-500 kr./lead
- Laan-refinansiering: 500-2.000 kr./lead
- Ved 5.000 aktive brugere: potentielt 20.000-50.000 kr./md.

**Konkret anbefaling:** Start med B2B pipeline NU. Brug den eksisterende Nordea/Danske Bank demo til at booke moeder. Samtidig lanceeres B2C med freemium for at bygge brugerbase og social proof der styrker B2B-salget.

---

### Outsourcing Ekspert - Skalering & ressourcer

**Hvad boer bygges internt vs. outsources?**

**Byg INTERNT (kernekompetence):**
- Budgetberegningslogik og dansk prisdata (det ER produktet)
- AI-prompt engineering og raadgivningskvalitet
- White-label framework og bank-tilpasning
- Onboarding UX og konverteringsoptimering
- Saelg og partnerskaber (kan IKKE outsources for B2B)

**OUTSOURCE:**
- SEO-content produktion (blog/guides om dansk privatoekonomi) - brug dansk freelance-skribent, 500-800 kr./artikel
- Grafisk design af marketing-assets - Fiverr/99designs, 2.000-5.000 kr. per kampagne
- QA/testning - brug Testlio eller lignende, 5.000-10.000 kr./md.
- Juridisk gennemgang (GDPR, finansiel raadgivning disclaimer) - dansk advokat, engangsbetaling 10.000-20.000 kr.
- App Store assets hvis I lancerer native wrapper - engangs 5.000-10.000 kr.

**Hvad kan automatiseres?**
- Prisdata-opdatering: Byg scraper der henter aktuelle streaminpriser, elpriser (allerede delvist gjort med market-data edge function), forsikringspriser
- AI-genereret ugentlig oekonomisk rapport per bruger (scheduler)
- Onboarding A/B-testing med feature flags
- Social media content via AI (men med dansk review)

**Kompetencer der mangler:**
1. **Salg/Business Development** - den vigtigste mangel. B2B-salg til banker kraever en dedikeret person med netvaerk i dansk finans
2. **Growth Marketing** - nogen der kan drive acquisition, SEO, SoMe
3. **Data/Analytics** - nogen der kan opsaette conversion tracking, kohorteanalyse, churn prediction
4. **Compliance/Juridisk** - deltid, men nodvendigt naar I taler med banker

**Konkrete anbefalinger til at skalere billigt:**
1. Hyr en freelance B2B-saelger paa provision (15-25% af foerste aars kontraktvaerdi)
2. Brug Claude/AI til at generere foerste udkast af blog-content, faa dansk native speaker til at redigere (halver content-cost)
3. Implementer Plausible Analytics (GDPR-venlig, 9 EUR/md.) i stedet for Google Analytics
4. Brug Supabase free tier saa laenge som muligt (allerede gjort)
5. Hold teamet under 3 personer det foerste aar. Faa freelancere til resten

---

### Produktudvikler - Produkt roadmap

**5 vigtigste features der MANGLER for at konkurrere:**

1. **Bankintegration (PSD2/Open Banking)** - Spiir har det, Lunar har det. Uden det vil mange brugere se Kassen som "endnu et manuelt budgetvaerktoj". Brug Aiia (Mastercard) eller Enable Banking som aggregator. DETTE er den stoerste feature-gap.

2. **Historisk tracking med reelle transaktioner** - Nuvaerende "historik" er snapshot-baseret. Brugere vil se trends over tid: "bruger jeg mere paa mad i december?" Kraever enten bankintegration eller manuel indberetning.

3. **Push-notifikationer og alerts** - "Din elregning steg 23% i denne maaned", "Du har brugt 80% af madbudgettet og der er 12 dage tilbage". Kraever service worker (allerede PWA) eller native app.

4. **Goal tracking / sparemaal** - "Jeg vil spare 50.000 kr. til sommerferie". Vis progress bar, foreslaa maanedligt beloeb, visualiser tidslinje. Spiir har "Challenges" - Kassen boer have noget smartere med AI.

5. **Delt budget i realtid for par** - Par-split view eksisterer, men det er statisk. Begge partnere boer kunne logge ind og se det samme budget, med live-opdateringer. Kraever bedre auth + realtime Supabase subscriptions.

**Hvad skal UD af produktet (for komplekst/forvirrende)?**

- **SuiteNav** - der er en "suite navigation" komponent der antyder flere produkter. Fjern den indtil der faktisk er flere produkter. Det forvirrer.
- **Naboeffekt/sammenligning** - med estimerede data er det meningsloest. Det er "sammenlign dig med fiktive naboer". Enten faa rigtige data (crowdsourced) eller fjern det.
- **Sankey-diagram** - det er visuelt flot, men 90% af brugere forstaar det ikke. Behold det som skjult avanceret feature (som det er nu), men lad vaere med at promovere det.

**Hvad er "killer feature" der kan differentiere?**

**"Budget-rapport til banken" + AI-genereret handlingsplan.**

Ingen anden dansk app laver et PDF-dokument du kan tage med til din bankraadgiver. Taenk paa det: naar danskere skal til bankmoede (boligkoeb, laan, refinansiering), bruger de et Excel-ark eller ingenting. Kassen kan generere en professionel rapport med:
- Overblik over indkomst/udgifter
- Health score med forklaring
- AI-anbefalinger
- Scenarie-analyse ("hvad hvis renten stiger 2%?")

Det er et haandgribeligt output der loser et reelt problem. Og det er en PERFEKT B2B-hook: banker vil elske at deres kunder kommer forberedt.

**Prioriteret feature backlog - naeste 3 maaneder:**

**Maaned 1 (KRITISK):**
- Fiks 404-routes (login, blog)
- Byg demo-mode med sample-data for B2B-pitches
- Implementer basis-analytics (Plausible)
- Lav PDF-export af budgetrapport
- Fjern falske testimonials, erstat med reelle eller fjern sektionen

**Maaned 2:**
- Freemium paywall (begrams AI-chat til 5/md. for gratis tier)
- Goal tracking / sparemaal
- Push-notifikationer via service worker
- SEO-optimeret blog med 10 artikler om dansk privatoekonomi

**Maaned 3:**
- Open Banking proof-of-concept med Enable Banking eller Aiia
- Historisk tracking (maanedlige snapshots med sammenligning)
- B2B-kundeportal (admin dashboard for bankpartnere der viser brugerstatistik)
- Par-deling via invite-link

---

### Software Ingenior - Teknisk vurdering

**Overordnet:**

Kodebasen er ren og velstruktureret for et tidligt produkt. React 18 + Vite + TypeScript + Tailwind + shadcn/ui er solide valg. Supabase backend er fornuftigt for tidligt stadie. Lazy loading af dashboard-sektioner er godt. Framer Motion animationer er velintegrerede.

**Teknisk gaeld der blokerer vaekst:**

1. **Ingen automatiserede tests for budgetberegninger.** `budgetCalculator.ts` er kernen i produktet - den beregner alt. Der er vitest sat op, men jeg ser ingen tests for den kritiske beregningslogik. Hvis nogen aendrer rentefradragsberegningen og det gaar i stykker, opdager man det foerst naar en bruger klager. DETTE ER FARLIGT.

2. **Prisdatabasen er hardcoded.** `priceDatabase.ts` indeholder alle danske priser (streaming, forsyning, bolig-estimater, bornecheck-satser). Disse aendres hvert aar. Der er ingen mekanisme til at opdatere dem uden en ny deployment. Boer flyttes til Supabase eller en separat config-fil der kan opdateres uafhaengigt.

3. **Ingen error tracking.** Der er ErrorBoundary-komponenter (godt!), men ingen integration med Sentry, LogRocket eller lignende. Naar brugere oplever fejl i produktion, ved I det ikke.

4. **localStorage som primaer datalager.** For ikke-logged-ind brugere gemmes alt i localStorage. Det forsvinder naar brugeren rydder browser, skifter enhed, eller bruger inkognito. Det er OK for MVP, men det foerer til frustrerede brugere der mister deres budget.

**Skalerbarhedsrisici:**

1. **AI-omkostninger.** Hver bruger der aabner AI-chat trigger et Claude Haiku API-kald. Rate limit er 20/time/IP, men ved 10.000 daglige brugere kan AI-omkostningerne lobe op i 5.000-15.000 kr./md. Der er ingen caching af AI-svar for typiske sporgsmal.

2. **CORS headers er `Access-Control-Allow-Origin: *`** i edge functions. Det er fint for nu, men for B2B white-label boer det laases til specifikke domaener.

3. **In-memory rate limiting i edge functions** virker ikke paalideligt med Supabase Edge Functions da de kan spinne op i flere instanser. Flyt rate limiting til Supabase database eller Redis.

**Hvad skal refaktoreres inden 10.000 brugere:**

1. **Enhedstest for alle beregninger** - budgetCalculator, healthScore, prisdatabase-lookups. Minimum 95% coverage paa disse filer.

2. **Flyt prisdatabase til Supabase** med en admin-UI til opdatering. Tilfoej "sidst opdateret" dato der vises til brugere.

3. **Implementer server-side session storage** som fallback for localStorage. Brugere der logger ind boer ALDRIG miste data.

4. **Tilfoej Sentry** for error tracking i produktion.

5. **Rate limiting via Supabase** (database-backed) i stedet for in-memory.

6. **Content Security Policy headers** paa Vercel deployment.

**Security concerns:**

1. **ANTHROPIC_API_KEY** er korrekt gemt som Supabase secret (godt). Men edge function sender hele budgetprofilen til Anthropic API. Tjek at dette er OK med jeres privatlivspolitik.

2. **Ingen input-validering i edge functions.** `req.json()` parses direkte uden Zod-validering. En ondsindet request kan sende uventede data. `profileSchema.ts` bruges paa klienten, men IKKE i edge functions.

3. **Supabase RLS (Row Level Security)** boer verificeres. `useAuth.ts` opdaterer `profiles`-tabellen direkte. Sorg for at RLS policies forhindrer brugere i at laese/skrive andre brugeres data.

4. **Cookie banner** er implementeret (godt), men der er ingen actual cookie-consent mekanisme der blokerer analytics foer accept.

---

### Markedsfoeringsekspert - Go-to-market strategi

**Primaer maalgruppe (vaer specifik!):**

**Segment 1 (B2C): "Den bekymrede foerstegangskoeber"**
- Alder: 28-38
- Situation: Par der overvejer at koebe bolig, eller lige har koebt. Usikre paa om de har raad
- Pain: "Kan vi klare det hvis renten stiger?" / "Hvad har vi reelt til overs efter alle udgifter?"
- Kanal: Google Soeg ("budgetberegner boligkoeb", "kan vi koebe hus"), Facebook grupper om boligkoeb
- Stoerrelse: Ca. 50.000 danske par/aar koeber bolig

**Segment 2 (B2C): "Den unge paa SU/foerste job"**
- Alder: 20-27
- Situation: Flyttet hjemmefra, foerste rigtige budget. Maske SU-laan
- Pain: "Pengene forsvinder og jeg ved ikke hvorhen"
- Kanal: Instagram, TikTok, Reddit (r/dkfinance)
- Stoerrelse: Ca. 150.000 studerende der flytter hjemmefra/aar

**Segment 3 (B2B): "Bankens digitaliseringsansvarlige"**
- Titel: Head of Digital, Product Owner, Innovation Manager
- Pain: "Vores konkurrenter har bedre digitale vaerktoejer. Vi mister kunder til Lunar"
- Kanal: LinkedIn, direkte outreach, branchekonferencer (Copenhagen Fintech, Money20/20)
- Stoerrelse: 15-20 relevante beslutningstagere i DK

**Hvilke kanaler virker for denne type produkt i DK?**

1. **Google Soeg (SEO + SEM)** - Hoej koebsintention. "budget app", "raedighedsbelob beregner", "budget skabelon". Lav konkurrence paa dansk. Kassen boer ranke for disse inden 6 maaneder
2. **Reddit r/dkfinance** - 85.000+ medlemmer. Organisk deltagelse med vaerdi (ikke spam). Et godt post kan give 500-1.000 nye brugere
3. **Facebook grupper** - "Foerstegangskoebere", "Spar penge i Danmark", bolig-grupper
4. **Instagram/TikTok** - Kort "budget reality check" content: "Du tror du har 8.000 kr. til overs? Lad os tjekke..."
5. **PR** - Dansk tech-presse (TechSavvy, Borsen, Finans.dk) elsker danske startups. En god pitch om "AI-budgetvaerktoj bygget til danske forhold" kan give massiv exposure

**Konkret lanceringsplan - foerste 30 dage:**

**Dag 1-7: Soft launch & fix**
- Fiks 404-fejl, fjern fake testimonials
- Saaet Plausible Analytics op
- Skriv 5 SEO-artikler ("Saadan laver du et budget 2026", "Hvad er et godt raedighedsbelob?", "Budget for foerstegangskoebere")
- Opret social media profiler (Instagram, LinkedIn)

**Dag 8-14: Community seeding**
- Post paa r/dkfinance: "Jeg har bygget et gratis dansk budgetvaerktoj med AI - feedback oenskes" (aerlig, ikke salesy)
- Del i 5-10 relevante Facebook grupper
- Kontakt 3 danske personlig-oekonomi bloggere/influencers for anmeldelse
- Maal: 500 brugere

**Dag 15-21: PR push**
- Send pressemeddelelse til Borsen, Finans.dk, TechSavvy, Computerworld
- Vinkel: "Dansk startup udfordrer Spiir med AI-budget der ikke kraever bankkobling"
- LinkedIn artikler fra grundlaegger om dansk privatoekonomi
- Maal: 2.000 brugere

**Dag 22-30: B2B outreach starter**
- Send personlige LinkedIn-beskeder til 15 relevante bankfolk
- Tilbyd gratis demo af white-label loesning
- Book minimum 3 moeder
- Maal: 5.000 B2C brugere + 3 B2B moeder

**Det ene budskab der skal slaa igennem:**

> "Find ud af hvad du REELT har til overs - paa 3 minutter. Gratis, privat, uden bankkobling."

Hvorfor det virker:
- "REELT" - antyder at du TROR du ved det, men du goer ikke. Nysgerrighed
- "3 minutter" - lav tidsbarriere
- "Gratis, privat, uden bankkobling" - fjerner de tre stoerste indvendinger mod budgetapps

---

## SAMLET KONKLUSION

Kassen er et imponerende tidligt produkt med reel differentiering: dansk kontekst, AI-raadgivning, privacy-first, og white-label klar. Det er IKKE en Spiir-konkurrent - det er et andet produkt til et delvist overlappende marked.

**Den stoerste fejl I kan lave:** At jagte B2C markedsandel mod Spiirs 400.000 brugere uden budget.

**Det smarteste I kan goere:** Bruge B2C som social proof og brugerbase, mens I saelger white-label til banker. Een bankaftale = 1-2 mio. kr./aar og legitimitet der driver B2C organisk.

**De 3 ting der skal ske DENNE UGE:**
1. Fiks de oedelaeggende 404-fejl
2. Byg en demo-mode med sample-data
3. Send de foerste 5 LinkedIn-beskeder til bankfolk

---

## KILDER

- [Spiir - spiir.dk](https://www.spiir.dk/)
- [Spiir - Google Play](https://play.google.com/store/apps/details?id=com.spiir&hl=en_US)
- [De 6 bedste budget apps i 2026 - Financer.dk](https://financer.dk/privatoekonomi/bedste-budget-apps/)
- [Lunar Bank Anmeldelse 2026 - Financer.dk](https://financer.dk/anmeldelse/lunar/)
- [Lunar Priser](https://www.lunar.app/en/personal/pricing)
- [Anmeldelse af Lunar 2026 - ungmedpenge.dk](https://ungmedpenge.dk/anmeldelse-af-lunar/)
- [YNAB Pricing](https://www.ynab.com/pricing)
- [YNAB Features](https://www.ynab.com/features)
- [YNAB Pricing 2026 - CheckThat.ai](https://checkthat.ai/brands/ynab/pricing)
- [Copilot Money](https://copilot.money/pricing/)
- [Copilot Money Review 2026 - Money with Katie](https://moneywithkatie.com/copilot-review-a-budgeting-app-that-finally-gets-it-right/)
- [Norm Invest Anmeldelse 2026 - Financer.dk](https://financer.dk/anmeldelse/nord-investments/)
- [Norm Invest](https://www.norminvest.com/)
- [Mybanker.dk](https://www.mybanker.dk/)
- [Mybanker - Wikipedia](https://da.wikipedia.org/wiki/Mybanker.dk)
- [Top 10 AI Financial Services Tools UK 2026](https://toptenaiagents.co.uk/lists/top-10-ai-financial-services-tools.html)
