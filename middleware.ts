import { next } from "@vercel/edge";

// ── Bot User-Agent patterns ──
const BOT_PATTERNS = [
  "Googlebot", "Bingbot", "bingbot", "Slurp", "DuckDuckBot", "Baiduspider",
  "YandexBot", "facebookexternalhit", "Facebot", "LinkedInBot", "Twitterbot",
  "Slackbot", "WhatsApp", "TelegramBot", "ChatGPT-User", "GPTBot", "ClaudeBot",
  "Claude-Web", "Anthropic", "Applebot", "Pinterestbot", "Discordbot", "Embedly",
  "Quora Link Preview", "Redditbot", "Rogerbot", "Screaming Frog", "Semrushbot",
  "AhrefsBot", "MJ12bot", "PetalBot",
];
const BOT_REGEX = new RegExp(BOT_PATTERNS.join("|"), "i");

// ── Site config ──
const SITE_URL = "https://nemtbudget.nu";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-nemtbudget.png`;

// ── Supabase config ──
const SUPABASE_URL = "https://gpzuhhfpwokevsljyumt.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// ── Route content ──
interface RouteMeta {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  bodyContent?: string;
}

async function fetchArticleContent(slug: string): Promise<RouteMeta | null> {
  if (!SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?select=title,excerpt,content&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = rows?.[0];
    if (!row?.title) return null;
    return {
      title: `${row.title} — NemtBudget`,
      description: row.excerpt || `Læs "${row.title}" på NemtBudget.`,
      ogTitle: row.title,
      ogDescription: row.excerpt || `Gratis guide om dansk privatøkonomi.`,
      bodyContent: row.content || "",
    };
  } catch {
    return null;
  }
}

// ── Rich page content ──
const PAGE_CONTENT: Record<string, string> = {
  "/": `
<h2>Tag kontrol over din privatøkonomi</h2>
<p>Find skjulte udgifter, se hvad du reelt har til overs og stå stærkt til fremtiden — gratis, privat og på 3 minutter.</p>

<h3>Hvad NemtBudget gør</h3>
<ul>
  <li><strong>Find skjulte udgifter:</strong> Analyser streaming, forsikring, transport og andre faste udgifter du måske har glemt.</li>
  <li><strong>Beregn dit rådighedsbeløb:</strong> Se hvad du reelt har til overs efter skat og faste udgifter.</li>
  <li><strong>AI-indsigt:</strong> Intelligent analyse af dine udgiftsmønstre med personlige besparelsesforslag.</li>
  <li><strong>Sammenlign med andre:</strong> Se din økonomi sammenlignet med andre i dit område og din aldersgruppe.</li>
  <li><strong>Stress-test:</strong> Hvad sker der med dit budget ved jobmistelse, rentestigning eller uventede udgifter?</li>
  <li><strong>Opsparingsplanlægger:</strong> Se hvornår du når dine opsparingsmål.</li>
  <li><strong>Bankmøde-rapport:</strong> Generer en rapport du kan tage med til din bankrådgiver.</li>
</ul>

<h3>Husstandstyper</h3>
<ul>
  <li><strong>Enlig husstand:</strong> Gennemsnitlig nettoindkomst ca. 27.000 kr/md efter skat.</li>
  <li><strong>Par / samboende:</strong> Gennemsnitlig husstandsindkomst ca. 52.000 kr/md.</li>
</ul>

<h3>Vigtige detaljer</h3>
<ul>
  <li>100% gratis. Ingen login påkrævet.</li>
  <li>Al beregning sker i din browser — vi gemmer ingen persondata.</li>
  <li>Bygget til dansk finanslovgivning.</li>
  <li>Udfyldt på 3 minutter.</li>
  <li>Data gemmes kun lokalt på din enhed.</li>
</ul>
`,

  "/lonseddel": `
<h2>Forstå din lønseddel på 10 sekunder</h2>
<p>Upload din lønseddel (foto eller PDF) og forstå hvert eneste fradrag. Se hvad AM-bidrag, A-skat, ATP og pension betyder — og om din løn er normal for din branche.</p>

<h3>Sådan virker det</h3>
<ol>
  <li>Upload foto eller PDF af din lønseddel (eller indsæt med Ctrl+V).</li>
  <li>AI læser automatisk alle beløb og fradrag.</li>
  <li>Se forklaring af hvert fradrag: AM-bidrag (8% af bruttoløn), A-skat, ATP (99 kr/md), pension osv.</li>
  <li>Få et anonymt delingskort du kan dele på Reddit (r/dkloenseddel, r/dkfinance) eller andre fora.</li>
</ol>

<h3>Privatliv</h3>
<ul>
  <li>Din lønseddel sendes krypteret til AI-analyse og slettes umiddelbart efter.</li>
  <li>Ingen mennesker ser din lønseddel.</li>
  <li>Delingskortet er anonymiseret — ingen personlige oplysninger.</li>
</ul>
`,

  "/guides": `
<h2>Guides — NemtBudget</h2>
<p>Artikler og guides om dansk privatøkonomi, budgetlægning, skat og opsparing. Gratis viden til at forbedre din økonomi.</p>
`,

  "/b2b": `
<h2>NemtBudget til virksomheder — White-label budgetværktøj</h2>
<p>Tilbyd dine kunder et white-label budgetværktøj med jeres eget brand. Perfekt til banker, pensionsselskaber og fagforeninger der vil give kunderne overblik over privatøkonomien.</p>
<ul>
  <li>Jeres logo og farver</li>
  <li>Integreret i jeres platform</li>
  <li>Dansk skatteberegning for alle 98 kommuner</li>
</ul>
`,

  "/partner": `
<h2>Bliv partner — NemtBudget</h2>
<p>Bliv partner med NemtBudget og tilbyd dine kunder Danmarks nemmeste budgetværktøj. Perfekt for finansielle rådgivere, revisorer og coaches.</p>
`,

  "/privatliv": `
<h2>Privatlivspolitik — NemtBudget</h2>
<p>Vi gemmer ingen persondata. Al beregning sker i din browser. Data gemmes kun lokalt på din enhed. Ingen cookies til tracking. GDPR-overholdende.</p>
`,

  "/vilkaar": `
<h2>Vilkår og betingelser — NemtBudget</h2>
<p>NemtBudget er et informationsværktøj og yder ikke finansiel rådgivning. Brug det som vejledning.</p>
`,

  "/install": `
<h2>Installér NemtBudget — Gratis app</h2>
<p>Installér NemtBudget som app på din telefon. Ingen App Store — bare tilføj til startskærm. Virker offline efter installation.</p>
`,
};

async function getRouteMeta(pathname: string): Promise<RouteMeta> {
  const path = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  const routes: Record<string, RouteMeta> = {
    "/": {
      title: "NemtBudget – Danmarks nemmeste budgetværktøj | Gratis",
      description: "Find ud af hvad du reelt har til overs. Beregn dit rådighedsbeløb gratis på 3 minutter. Ingen login, 100% privat.",
      ogTitle: "NemtBudget – Familieøkonomi der føles som lettelse",
      ogDescription: "NemtBudget giver din familie overblik over økonomien på under 3 minutter. Gratis og privat.",
    },
    "/lonseddel": {
      title: "Forstå din lønseddel på 10 sekunder — nemtbudget.nu",
      description: "Upload din lønseddel og forstå hvert eneste fradrag. Se hvad AM-bidrag, A-skat og pension betyder — og om din løn er normal for din branche.",
      ogTitle: "Forstå din lønseddel på 10 sekunder",
      ogDescription: "Upload din lønseddel — vi forklarer hvert fradrag, tjekker om din løn er normal, og laver et anonymt delingskort klar til Reddit.",
    },
    "/guides": {
      title: "Guides — NemtBudget",
      description: "Artikler og guides om dansk privatøkonomi, budgetlægning, skat og opsparing.",
      ogTitle: "Guides — NemtBudget",
      ogDescription: "Lær om dansk privatøkonomi med gratis guides fra NemtBudget.",
    },
    "/b2b": {
      title: "NemtBudget til virksomheder — White-label budgetværktøj",
      description: "Tilbyd dine kunder et white-label budgetværktøj med jeres eget brand. Perfekt til banker, pensionsselskaber og fagforeninger.",
      ogTitle: "NemtBudget til virksomheder",
      ogDescription: "White-label budgetværktøj til banker, pensionsselskaber og fagforeninger.",
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
    "/login": {
      title: "Log ind — NemtBudget",
      description: "Log ind på din NemtBudget-konto for at gemme og dele dit budget.",
    },
    "/install": {
      title: "Installér NemtBudget — Gratis app",
      description: "Installér NemtBudget som app på din telefon. Ingen App Store — bare tilføj til startskærm.",
    },
  };

  if (path.startsWith("/s/")) {
    return {
      title: "Delt budget — NemtBudget",
      description: "Se dette budget delt via NemtBudget. Beregn dit eget gratis.",
      ogTitle: "Se dette budget — NemtBudget",
      ogDescription: "Nogen har delt deres budget med dig. Beregn dit eget gratis på nemtbudget.nu.",
    };
  }

  if (path.startsWith("/guides/")) {
    const slug = path.replace("/guides/", "");
    if (slug) {
      const dynamic = await fetchArticleContent(slug);
      if (dynamic) return dynamic;
    }
    return { title: "Guide — NemtBudget", description: "Læs denne guide om dansk privatøkonomi på NemtBudget." };
  }

  const meta = routes[path] || routes["/"];
  meta.bodyContent = PAGE_CONTENT[path] || PAGE_CONTENT["/"];
  return meta;
}

// ── Build HTML ──
async function buildBotHTML(pathname: string): Promise<string> {
  const meta = await getRouteMeta(pathname);
  const canonicalUrl = `${SITE_URL}${pathname === "/" ? "" : pathname}`;
  const ogTitle = meta.ogTitle || meta.title;
  const ogDesc = meta.ogDescription || meta.description;
  const ogImage = meta.ogImage || DEFAULT_OG_IMAGE;
  const ogType = meta.ogType || "website";
  const body = meta.bodyContent || `<h1>${ogTitle}</h1><p>${meta.description}</p>`;

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDesc}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="da_DK" />
  <meta property="og:site_name" content="NemtBudget" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDesc}" />
  <meta name="twitter:image" content="${ogImage}" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "NemtBudget",
    "url": "${SITE_URL}",
    "description": "${meta.description}",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Web",
    "inLanguage": "da",
    "isAccessibleForFree": true
  }
  </script>
</head>
<body>
  <main>
    ${body}
  </main>
  <footer>
    <p><a href="${SITE_URL}">NemtBudget.nu</a> — Danmarks nemmeste budgetværktøj. Gratis, privat, udfyldt på 3 minutter.</p>
    <nav>
      <a href="${SITE_URL}/lonseddel">Lønseddel-læser</a> ·
      <a href="${SITE_URL}/guides">Guides</a> ·
      <a href="${SITE_URL}/b2b">Virksomheder</a> ·
      <a href="${SITE_URL}/partner">Partnere</a>
    </nav>
  </footer>
</body>
</html>`;
}

// ── Middleware ──
export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/functions") ||
    /\.(js|css|ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|mp4|webm|json|xml|txt|map)$/.test(pathname)
  ) {
    return next();
  }

  const userAgent = request.headers.get("user-agent") || "";
  const isBot = BOT_REGEX.test(userAgent) || !userAgent || !userAgent.includes("Mozilla");
  if (isBot) {
    const html = await buildBotHTML(pathname);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  return next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|mp4|webm|json|xml|txt|map)$).*)",
  ],
};
