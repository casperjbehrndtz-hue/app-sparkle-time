// ─── Site Configuration ─────────────────────────────────────────────────────

export interface SiteConfig {
  /** Full site URL without trailing slash, e.g. "https://nemtbudget.nu" */
  siteUrl: string;
  /** Site display name, e.g. "NemtBudget" */
  siteName: string;
  /** Default OG image path (relative to siteUrl), e.g. "/og-nemtbudget.png" */
  defaultOgImage: string;
  /** Supabase project URL */
  supabaseUrl: string;
  /** Environment variable name for Supabase anon key, defaults to "VITE_SUPABASE_PUBLISHABLE_KEY" */
  supabaseKeyEnv?: string;
  /** Language code, defaults to "da" */
  lang?: string;
  /** OG locale, defaults to "da_DK" */
  ogLocale?: string;
  /** Twitter handle, e.g. "@boerneskat" (optional) */
  twitterSite?: string;
}

// ─── Middleware Configuration ────────────────────────────────────────────────

export interface RouteMeta {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  bodyContent?: string;
  /** Override JSON-LD for this page (replaces default WebApplication) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Breadcrumb trail for this page */
  breadcrumbs?: { name: string; url: string }[];
}

export interface DynamicRouteHandler {
  /** URL path prefix to match, e.g. "/guides/" or "/blog/" */
  prefix: string;
  /** Fetch meta for the matched slug */
  fetch: (slug: string, supabaseUrl: string, supabaseKey: string) => Promise<RouteMeta | null>;
  /** Fallback meta if fetch returns null */
  fallback: RouteMeta;
}

export interface Redirect {
  from: string;
  to: string;
  status?: 301 | 302;
}

/** Organization info for structured data */
export interface OrganizationInfo {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  foundingDate?: string;
  /** Social profile URLs */
  sameAs?: string[];
}

/** Cross-site link for ecosystem linking */
export interface EcosystemLink {
  name: string;
  url: string;
  description: string;
}

export interface MiddlewareConfig extends SiteConfig {
  /** Static route meta definitions */
  routes: Record<string, RouteMeta>;
  /** Rich HTML content for bot rendering, keyed by path */
  pageContent: Record<string, string>;
  /** Dynamic route handlers (blog, articles, etc.) */
  dynamicRoutes?: DynamicRouteHandler[];
  /** Server-side redirects */
  redirects?: Redirect[];
  /** Footer HTML for bot pages */
  footerNav: string;
  /** Organization info for homepage JSON-LD */
  organization?: OrganizationInfo;
  /** Default WebApplication JSON-LD extras */
  extraJsonLd?: Record<string, unknown>;
  /** Additional path prefixes to skip (beyond defaults like /_next, /api) */
  skipPrefixes?: string[];
  /** Links to sister sites in the ecosystem */
  ecosystemLinks?: EcosystemLink[];
  /** Short tagline for footer */
  footerTagline?: string;
}

// ─── Sitemap Configuration ──────────────────────────────────────────────────

export interface StaticRoute {
  path: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
}

export interface SitemapConfig extends SiteConfig {
  /** Static routes to include */
  staticRoutes: StaticRoute[];
  /** Supabase table name for articles/blog posts */
  articleTable: string;
  /** Select fields for the article query */
  articleSelect: string;
  /** Filter for published articles, e.g. "status=eq.published" */
  articleFilter: string;
  /** URL prefix for articles, e.g. "/guides" or "/blog" */
  articlePrefix: string;
  /** Output path for sitemap.xml */
  outputPath: string;
}

// ─── usePageMeta Configuration ──────────────────────────────────────────────

export interface PageMetaConfig {
  /** Full site URL without trailing slash */
  siteUrl: string;
  /** Site display name */
  siteName: string;
  /** Default OG image path (relative or absolute) */
  defaultOgImage: string;
  /** OG locale, defaults to "da_DK" */
  ogLocale?: string;
  /** Twitter handle (optional) */
  twitterSite?: string;
  /** Hreflang codes to emit, defaults to ["da", "x-default"] */
  hreflangCodes?: string[];
}

export interface PageMetaOptions {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

// ─── Rich Schema Types (Upgrade 3) ─────────────────────────────────────────

/** HowTo schema for step-by-step guides and calculators */
export interface HowToStep {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

export interface HowToSchema {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string; // ISO 8601 duration, e.g. "PT15M"
  estimatedCost?: { currency: string; value: string };
}

/** FinancialProduct schema for savings accounts, investment products */
export interface FinancialProductSchema {
  name: string;
  description: string;
  provider?: string;
  category?: string; // e.g. "SavingsAccount", "InvestmentFund"
  interestRate?: { value: string; minValue?: string; maxValue?: string };
  annualPercentageRate?: string;
  feesAndCommissions?: string;
  currency?: string;
}

/** DefinedTerm schema for glossary/term definitions */
export interface DefinedTermSchema {
  name: string;
  description: string;
  termCode?: string;
  inDefinedTermSet?: string; // e.g. "Dansk Finansordbog"
  url?: string;
}

/** SpeakableSpecification for voice/AI assistants */
export interface SpeakableSpec {
  /** CSS selectors for speakable content, e.g. [".answer-box", "h2", ".faq-answer"] */
  cssSelector: string[];
}

/** Dataset schema for pages using live statistics */
export interface DatasetSchema {
  name: string;
  description: string;
  url?: string;
  creator?: string; // e.g. "Danmarks Statistik"
  dateModified?: string;
  measurementTechnique?: string;
  variableMeasured?: string[];
  license?: string;
}

/** Citation for references section */
export interface Citation {
  name: string;
  url: string;
  dateAccessed?: string;
  publisher?: string;
}

/** Answer box configuration for AI Overview optimization */
export interface AnswerBox {
  /** Direct answer text (max 50 words) */
  answer: string;
  /** CSS class for the answer box element */
  className?: string;
}
