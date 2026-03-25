import { createMiddleware, createArticleFetcher, defaultMatcherConfig } from "./src/lib/dk-seo/middleware";

// ── Article fetcher with Article schema + breadcrumbs ──
const fetchGuide = createArticleFetcher({
  table: "articles",
  select: "title,excerpt,content,published_at,updated_at,keywords",
  siteName: "NemtBudget",
  siteUrl: "https://nemtbudget.nu",
  urlPrefix: "/guides",
  parentLabel: "Guides",
  fields: { excerpt: "excerpt", content: "content", publishedAt: "published_at", updatedAt: "updated_at", keyword: "keywords" },
});

// ── Middleware ──
export default createMiddleware({
  siteUrl: "https://nemtbudget.nu",
  siteName: "NemtBudget",
  defaultOgImage: "/og-nemtbudget.png",
  supabaseUrl: "https://gpzuhhfpwokevsljyumt.supabase.co",

  organization: {
    name: "NemtBudget",
    url: "https://nemtbudget.nu",
    logo: "https://nemtbudget.nu/og-nemtbudget.png",
    description: "Danmarks nemmeste budgetværktøj. Gratis, privat, udfyldt på 3 minutter.",
    foundingDate: "2025",
  },

  ecosystemLinks: [
    { name: "ParFinans", url: "https://www.parfinans.dk", description: "Fair fordeling af fællesudgifter for par" },
    { name: "Børneskat.dk", url: "https://xn--brneskat-54a.dk", description: "Skatteeffektiv investering til dit barn via frikortet" },
  ],

  footerTagline: "NemtBudget.nu — Danmarks nemmeste budgetværktøj. Gratis, privat, udfyldt på 3 minutter.",

  routes: {
    "/": {
      title: "NemtBudget – Danmarks nemmeste budgetværktøj | Gratis budgetberegner",
      description: "Find ud af hvad du reelt har til overs. Beregn dit rådighedsbeløb gratis på 3 minutter. Ingen login, 100% privat. Dansk skat for alle 98 kommuner.",
      ogTitle: "NemtBudget – Familieøkonomi der føles som lettelse",
      ogDescription: "NemtBudget giver din familie overblik over økonomien på under 3 minutter. Gratis og privat.",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "NemtBudget",
          url: "https://nemtbudget.nu",
          description: "Beregn dit rådighedsbeløb gratis på 3 minutter. Dansk skat for alle 98 kommuner.",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          inLanguage: "da",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Hvad er et rådighedsbeløb?",
              acceptedAnswer: { "@type": "Answer", text: "Rådighedsbeløbet er det beløb du har til overs efter alle faste udgifter som bolig, forsikring, transport og skat er betalt. Det er dine penge til mad, tøj, oplevelser og opsparing." },
            },
            {
              "@type": "Question",
              name: "Hvordan beregner NemtBudget min skat?",
              acceptedAnswer: { "@type": "Answer", text: "NemtBudget beregner dansk skat med 2026-satser for alle 98 kommuner: AM-bidrag 8%, personfradrag 54.100 kr., bundskat 12,06%, topskat og kommuneskat. Beregningen sker i din browser." },
            },
            {
              "@type": "Question",
              name: "Er NemtBudget gratis?",
              acceptedAnswer: { "@type": "Answer", text: "Ja, NemtBudget er 100% gratis. Ingen login påkrævet. Al beregning sker i din browser og vi gemmer ingen persondata." },
            },
            {
              "@type": "Question",
              name: "Hvad er et godt rådighedsbeløb?",
              acceptedAnswer: { "@type": "Answer", text: "For en enlig husstand er et rådighedsbeløb på 5.000-8.000 kr/md efter alle faste udgifter typisk. For par er 8.000-15.000 kr/md normalt. Det afhænger af indkomst, boligform og livsstil." },
            },
          ],
        },
      ],
    },
    "/lonseddel": {
      title: "Forstå din lønseddel på 10 sekunder — nemtbudget.nu",
      description: "Upload din lønseddel og forstå hvert eneste fradrag. Se hvad AM-bidrag, A-skat og pension betyder — og om din løn er normal for din branche.",
      ogTitle: "Forstå din lønseddel på 10 sekunder",
      ogDescription: "Upload din lønseddel — vi forklarer hvert fradrag, tjekker om din løn er normal, og laver et anonymt delingskort.",
      breadcrumbs: [
        { name: "NemtBudget", url: "/" },
        { name: "Lønseddel-analyse", url: "/lonseddel" },
      ],
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "Forstå din lønseddel",
        description: "Upload din lønseddel og få forklaring af hvert fradrag på 10 sekunder.",
        step: [
          { "@type": "HowToStep", name: "Upload", text: "Tag et foto eller upload PDF af din lønseddel." },
          { "@type": "HowToStep", name: "AI-analyse", text: "AI læser automatisk bruttoløn, AM-bidrag, A-skat, ATP og pension." },
          { "@type": "HowToStep", name: "Resultat", text: "Se forklaring af hvert fradrag og sammenlign med andre i din branche." },
        ],
        totalTime: "PT10S",
      },
    },
    "/pengetjek": {
      title: "Pengetjek — Se hvor dine penge forsvinder hen | NemtBudget",
      description: "Upload dit kontoudtog og se dine pengeslugere på 30 sekunder. Find abonnementer du har glemt og få overblik over dit forbrug.",
      ogTitle: "Pengetjek — Se hvor dine penge forsvinder hen",
      ogDescription: "Upload kontoudtog og se dine pengeslugere. Find glemte abonnementer og få overblik.",
      breadcrumbs: [
        { name: "NemtBudget", url: "/" },
        { name: "Pengetjek", url: "/pengetjek" },
      ],
    },
    "/jobskifte": {
      title: "Jobskifte-sammenligner — NemtBudget",
      description: "Sammenlign dit nuværende job med et nyt tilbud. Se den reelle forskel i netto, pension og total kompensation efter skat.",
      ogTitle: "Jobskifte-sammenligner — NemtBudget",
      ogDescription: "Sammenlign dit nuværende job med et nyt tilbud. Se den reelle forskel i netto, pension og total kompensation efter skat.",
      breadcrumbs: [
        { name: "NemtBudget", url: "/" },
        { name: "Jobskifte-sammenligner", url: "/jobskifte" },
      ],
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Jobskifte-sammenligner",
        url: "https://nemtbudget.nu/jobskifte",
        description: "Sammenlign dit nuværende job med et nyt tilbud. Se den reelle forskel i netto, pension og total kompensation efter skat.",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "da",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
      },
    },
    "/guides": {
      title: "Guides om privatøkonomi — NemtBudget",
      description: "Gratis artikler og guides om dansk privatøkonomi, budgetlægning, rådighedsbeløb, skat og opsparing.",
      ogTitle: "Guides — NemtBudget",
      ogDescription: "Lær om dansk privatøkonomi med gratis guides fra NemtBudget.",
      breadcrumbs: [
        { name: "NemtBudget", url: "/" },
        { name: "Guides", url: "/guides" },
      ],
    },
    "/b2b": {
      title: "NemtBudget til virksomheder — White-label budgetværktøj",
      description: "Tilbyd dine kunder et white-label budgetværktøj med jeres eget brand. Perfekt til banker, pensionsselskaber og fagforeninger.",
      ogTitle: "NemtBudget til virksomheder",
      ogDescription: "White-label budgetværktøj til banker, pensionsselskaber og fagforeninger.",
      breadcrumbs: [
        { name: "NemtBudget", url: "/" },
        { name: "Virksomheder", url: "/b2b" },
      ],
    },
    "/partner": {
      title: "Bliv partner — NemtBudget",
      description: "Bliv partner med NemtBudget og tilbyd dine kunder Danmarks nemmeste budgetværktøj.",
    },
    "/privatliv": {
      title: "Privatlivspolitik — NemtBudget",
      description: "Læs NemtBudgets privatlivspolitik. Vi gemmer ingen persondata — al beregning sker i din browser.",
    },
    "/vilkaar": {
      title: "Vilkår og betingelser — NemtBudget",
      description: "Læs vilkår og betingelser for brug af NemtBudget.",
    },
    "/install": {
      title: "Installér NemtBudget — Gratis app til telefonen",
      description: "Installér NemtBudget som app på din telefon. Ingen App Store — bare tilføj til startskærm. Virker offline.",
    },
  },

  dynamicRoutes: [
    {
      prefix: "/s/",
      fetch: async () => null,
      fallback: {
        title: "Delt budget — NemtBudget",
        description: "Se dette budget delt via NemtBudget. Beregn dit eget gratis.",
        ogTitle: "Se dette budget — NemtBudget",
        ogDescription: "Nogen har delt deres budget med dig. Beregn dit eget gratis på nemtbudget.nu.",
      },
    },
    {
      prefix: "/guides/",
      fetch: fetchGuide,
      fallback: {
        title: "Guide — NemtBudget",
        description: "Læs denne guide om dansk privatøkonomi på NemtBudget.",
        breadcrumbs: [
          { name: "NemtBudget", url: "/" },
          { name: "Guides", url: "/guides" },
        ],
      },
    },
  ],

  pageContent: {
    "/": `
<h1>NemtBudget — Beregn dit rådighedsbeløb gratis</h1>
<p>Find ud af hvad du reelt har til overs efter skat og faste udgifter. <strong>Udfyldt på 3 minutter, 100% gratis, ingen login.</strong></p>

<h2>Hvad NemtBudget gør for dig</h2>
<ul>
  <li><strong>Beregn dit rådighedsbeløb:</strong> Se hvad du reelt har til overs efter skat og faste udgifter. <a href="https://nemtbudget.nu/guides/raadighedsbeloeb-beregning">Læs mere om rådighedsbeløb →</a></li>
  <li><strong>Find skjulte udgifter:</strong> Analyser streaming, forsikring, transport og andre faste udgifter du måske har glemt.</li>
  <li><strong>AI-indsigt:</strong> Intelligent analyse af dine udgiftsmønstre med personlige besparelsesforslag.</li>
  <li><strong>Sammenlign med andre:</strong> Se din økonomi sammenlignet med andre i dit område og din aldersgruppe.</li>
  <li><strong>Stress-test:</strong> Hvad sker der med dit budget ved jobmistelse, rentestigning eller uventede udgifter?</li>
  <li><strong>Opsparingsplanlægger:</strong> Se hvornår du når dine opsparingsmål. <a href="https://nemtbudget.nu/guides/noedbuffer-hvad-er-det">Hvad er en nødbuffer? →</a></li>
</ul>

<h2>Forstå din lønseddel</h2>
<p><a href="https://nemtbudget.nu/lonseddel"><strong>Upload din lønseddel</strong></a> og forstå hvert eneste fradrag: AM-bidrag, A-skat, ATP og pension. Se om din løn er normal for din branche.</p>

<h2>Se hvor dine penge forsvinder hen</h2>
<p><a href="https://nemtbudget.nu/pengetjek"><strong>Upload dit kontoudtog</strong></a> og find pengeslugere, glemte abonnementer og få overblik over dit faktiske forbrug.</p>

<h2>Dansk skat for alle 98 kommuner</h2>
<p>NemtBudget beregner med 2026-satser: AM-bidrag 8%, personfradrag 54.100 kr., bundskat 12,06%, topskat og kommuneskat. Al beregning sker i din browser — vi gemmer ingen persondata.</p>

<h2>Gratis guides om privatøkonomi</h2>
<p>Lær om <a href="https://nemtbudget.nu/guides/50-30-20-reglen-budget">50/30/20-reglen</a>, <a href="https://nemtbudget.nu/guides/raadighedsbeloeb-beregning">hvordan du beregner dit rådighedsbeløb</a>, og <a href="https://nemtbudget.nu/guides/noedbuffer-hvad-er-det">hvad en nødbuffer er</a>.</p>`,

    "/lonseddel": `
<h1>Forstå din lønseddel på 10 sekunder</h1>
<p>Upload din lønseddel (foto eller PDF) og forstå hvert eneste fradrag. Se hvad AM-bidrag, A-skat, ATP og pension betyder — og om din løn er normal for din branche.</p>

<h2>Sådan virker det</h2>
<ol>
  <li>Upload foto eller PDF af din lønseddel (eller indsæt med Ctrl+V).</li>
  <li>AI læser automatisk alle beløb og fradrag.</li>
  <li>Se forklaring af hvert fradrag: AM-bidrag (8% af bruttoløn), A-skat, ATP (99 kr/md), pension.</li>
  <li>Sammenlign din løn med andre i din branche.</li>
</ol>

<h2>Privatliv</h2>
<p>Din lønseddel sendes krypteret til AI-analyse og slettes umiddelbart efter. Ingen mennesker ser din lønseddel.</p>

<p>Vil du se hvad du har til overs? <a href="https://nemtbudget.nu"><strong>Beregn dit budget gratis →</strong></a></p>`,

    "/pengetjek": `
<h1>Pengetjek — Se hvor dine penge forsvinder hen</h1>
<p>Upload dit kontoudtog (CSV, PDF eller billede) og se dine største pengeslugere på 30 sekunder.</p>

<h2>Hvad Pengetjek viser dig</h2>
<ul>
  <li>Dine top 5 pengeslugere med beløb og procent af forbrug</li>
  <li>Glemte abonnementer (Netflix, fitness, streaming osv.)</li>
  <li>Kategorifordeling af alle udgifter</li>
  <li>Sammenligning med gennemsnitligt dansk forbrug</li>
</ul>

<p>Klar til at lave et budget? <a href="https://nemtbudget.nu"><strong>Beregn dit rådighedsbeløb gratis →</strong></a></p>`,

    "/jobskifte": `
<h1>Jobskifte-sammenligner — Sammenlign dit nuværende og nye job</h1>
<p>Overvejer du at skifte job? Sammenlign dit nuværende job med et nyt tilbud og se den reelle forskel i netto, pension og total kompensation efter skat.</p>

<h2>Hvad jobskifte-sammenligningen viser dig</h2>
<ul>
  <li>Reelt nettoløn-forskel efter skat og AM-bidrag</li>
  <li>Pensionsforskel inkl. arbejdsgiver- og medarbejderbidrag</li>
  <li>Total kompensation side-om-side</li>
  <li>Dansk skatteberegning med 2026-satser for alle 98 kommuner</li>
</ul>

<p>Klar til at lave et budget? <a href="https://nemtbudget.nu"><strong>Beregn dit rådighedsbeløb gratis →</strong></a></p>`,

    "/guides": `
<h1>Guides om dansk privatøkonomi</h1>
<p>Gratis artikler og guides om budgetlægning, skat, opsparing og hverdagsøkonomi.</p>
<ul>
  <li><a href="https://nemtbudget.nu/guides/raadighedsbeloeb-beregning">Rådighedsbeløb: Hvad er det og hvordan beregner du det?</a></li>
  <li><a href="https://nemtbudget.nu/guides/50-30-20-reglen-budget">50/30/20-reglen: Den nemmeste budgetmetode</a></li>
  <li><a href="https://nemtbudget.nu/guides/noedbuffer-hvad-er-det">Nødbuffer: Hvad er det og hvor stor skal den være?</a></li>
</ul>
<p><a href="https://nemtbudget.nu"><strong>Beregn dit budget gratis →</strong></a></p>`,

    "/b2b": `
<h1>NemtBudget til virksomheder — White-label budgetværktøj</h1>
<p>Tilbyd dine kunder et white-label budgetværktøj med jeres eget brand. Perfekt til banker, pensionsselskaber og fagforeninger.</p>
<ul>
  <li>Jeres logo og farver</li>
  <li>Integreret i jeres platform</li>
  <li>Dansk skatteberegning for alle 98 kommuner med 2026-satser</li>
</ul>`,

    "/privatliv": `
<h1>Privatlivspolitik — NemtBudget</h1>
<p>Vi gemmer ingen persondata. Al beregning sker i din browser. Data gemmes kun lokalt på din enhed. Ingen cookies til tracking. GDPR-overholdende.</p>`,

    "/vilkaar": `
<h1>Vilkår og betingelser — NemtBudget</h1>
<p>NemtBudget er et informationsværktøj og yder ikke finansiel rådgivning. Brug det som vejledning.</p>`,

    "/install": `
<h1>Installér NemtBudget</h1>
<p>Installér NemtBudget som app på din telefon. Ingen App Store — bare tilføj til startskærm. Virker offline efter installation.</p>`,
  },

  footerNav: `
      <a href="https://nemtbudget.nu/lonseddel">Lønseddel-analyse</a> ·
      <a href="https://nemtbudget.nu/pengetjek">Pengetjek</a> ·
      <a href="https://nemtbudget.nu/jobskifte">Jobskifte</a> ·
      <a href="https://nemtbudget.nu/guides">Guides</a> ·
      <a href="https://nemtbudget.nu/b2b">Virksomheder</a>`,
});

export const config = defaultMatcherConfig;
