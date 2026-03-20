import { next } from "@vercel/edge";

// ── Bot User-Agent patterns ──
const BOT_PATTERNS = [
  "Googlebot",
  "Bingbot",
  "bingbot",
  "Slurp",
  "DuckDuckBot",
  "Baiduspider",
  "YandexBot",
  "facebookexternalhit",
  "Facebot",
  "LinkedInBot",
  "Twitterbot",
  "Slackbot",
  "WhatsApp",
  "TelegramBot",
  "ChatGPT-User",
  "GPTBot",
  "ClaudeBot",
  "Claude-Web",
  "Anthropic",
  "Applebot",
  "Pinterestbot",
  "Discordbot",
  "Embedly",
  "Quora Link Preview",
  "Redditbot",
  "Rogerbot",
  "Screaming Frog",
  "Semrushbot",
  "AhrefsBot",
  "MJ12bot",
  "PetalBot",
];

const BOT_REGEX = new RegExp(BOT_PATTERNS.join("|"), "i");

// ── Site config ──
const SITE_URL = "https://nemtbudget.nu";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

// ── Supabase config (anon key is public — used in frontend) ──
const SUPABASE_URL = "https://gpzuhhfpwokevsljyumt.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// ── Route meta data ──
interface RouteMeta {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
}

async function fetchArticleMeta(slug: string): Promise<RouteMeta | null> {
  if (!SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?select=title,excerpt&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
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
    };
  } catch {
    return null;
  }
}

async function getRouteMeta(pathname: string): Promise<RouteMeta> {
  const path = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  const routes: Record<string, RouteMeta> = {
    "/": {
      title: "NemtBudget – Danmarks nemmeste budgetværktøj | Gratis",
      description:
        "Find ud af hvad du reelt har til overs. Beregn dit rådighedsbeløb gratis på 3 minutter. Ingen login, 100% privat.",
      ogTitle: "NemtBudget – Familieøkonomi der føles som lettelse",
      ogDescription:
        "NemtBudget giver din familie overblik over økonomien på under 3 minutter. Gratis og privat.",
    },
    "/lonseddel": {
      title: "Forstå din lønseddel på 10 sekunder — nemtbudget.nu",
      description:
        "Upload din lønseddel og forstå hvert eneste fradrag. Se hvad AM-bidrag, A-skat og pension betyder — og om din løn er normal for din branche.",
      ogTitle: "Forstå din lønseddel på 10 sekunder",
      ogDescription:
        "Upload din lønseddel — vi forklarer hvert fradrag, tjekker om din løn er normal, og laver et anonymt delingskort klar til Reddit.",
    },
    "/guides": {
      title: "Guides — NemtBudget",
      description:
        "Artikler og guides om dansk privatøkonomi, budgetlægning, skat og opsparing.",
      ogTitle: "Guides — NemtBudget",
      ogDescription:
        "Lær om dansk privatøkonomi med gratis guides fra NemtBudget.",
    },
    "/b2b": {
      title: "NemtBudget til virksomheder — White-label budgetværktøj",
      description:
        "Tilbyd dine kunder et white-label budgetværktøj med jeres eget brand. Perfekt til banker, pensionsselskaber og fagforeninger.",
      ogTitle: "NemtBudget til virksomheder",
      ogDescription:
        "White-label budgetværktøj til banker, pensionsselskaber og fagforeninger.",
    },
    "/partner": {
      title: "Bliv partner — NemtBudget",
      description:
        "Bliv partner med NemtBudget og tilbyd dine kunder Danmarks nemmeste budgetværktøj.",
    },
    "/privatliv": {
      title: "Privatlivspolitik — NemtBudget",
      description:
        "Læs NemtBudgets privatlivspolitik. Vi gemmer ingen persondata — al beregning sker i din browser.",
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
      description:
        "Installér NemtBudget som app på din telefon. Ingen App Store — bare tilføj til startskærm.",
    },
  };

  // Dynamic routes
  if (path.startsWith("/s/")) {
    return {
      title: "Delt budget — NemtBudget",
      description:
        "Se dette budget delt via NemtBudget. Beregn dit eget gratis.",
      ogTitle: "Se dette budget — NemtBudget",
      ogDescription:
        "Nogen har delt deres budget med dig. Beregn dit eget gratis på nemtbudget.nu.",
    };
  }

  if (path.startsWith("/guides/")) {
    const slug = path.replace("/guides/", "");
    if (slug) {
      const dynamic = await fetchArticleMeta(slug);
      if (dynamic) return dynamic;
    }
    return {
      title: "Guide — NemtBudget",
      description:
        "Læs denne guide om dansk privatøkonomi på NemtBudget.",
      ogTitle: "Guide — NemtBudget",
      ogDescription: "Gratis guide om dansk privatøkonomi.",
    };
  }

  return routes[path] || routes["/"];
}

// ── Build HTML response for bots ──
async function buildBotHTML(pathname: string): Promise<string> {
  const meta = await getRouteMeta(pathname);
  const canonicalUrl = `${SITE_URL}${pathname === "/" ? "" : pathname}`;
  const ogTitle = meta.ogTitle || meta.title;
  const ogDesc = meta.ogDescription || meta.description;
  const ogImage = meta.ogImage || DEFAULT_OG_IMAGE;
  const ogType = meta.ogType || "website";

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
  <h1>${ogTitle}</h1>
  <p>${meta.description}</p>
  <a href="${canonicalUrl}">${canonicalUrl}</a>
</body>
</html>`;
}

// ── Middleware ──
export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Skip static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/functions") ||
    /\.(js|css|ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|mp4|webm|json|xml|txt|map)$/.test(pathname)
  ) {
    return next();
  }

  // Check if request is from a bot or non-browser tool (e.g. AI fetch, curl, API clients).
  // Real browsers always include "Mozilla" in their UA string.
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

  // Normal users: pass through to SPA
  return next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|mp4|webm|json|xml|txt|map)$).*)",
  ],
};
