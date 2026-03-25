-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  UPGRADE 1: SEO Performance Tracking (GSC Feedback Loop)                   ║
-- ║  UPGRADE 2: Topical Authority Clusters                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ── Performance tracking table (fed by Google Search Console API) ──

CREATE TABLE IF NOT EXISTS public.seo_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  avg_position DECIMAL(5,2) DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  top_queries JSONB DEFAULT '[]'::jsonb,
  needs_refresh BOOLEAN DEFAULT false,
  refresh_reason TEXT,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(slug)
);

CREATE INDEX IF NOT EXISTS idx_seo_perf_needs_refresh
  ON public.seo_performance(needs_refresh) WHERE needs_refresh = true;
CREATE INDEX IF NOT EXISTS idx_seo_perf_position
  ON public.seo_performance(avg_position);

-- ── Keyword discovery table ──

CREATE TABLE IF NOT EXISTS public.seo_discovered_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL UNIQUE,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  avg_position DECIMAL(5,2) DEFAULT 0,
  source_slug TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'queued', 'ignored', 'published')),
  suggested_module TEXT,
  discovered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_discovered_status
  ON public.seo_discovered_keywords(status, impressions DESC);

-- ── Topical authority clusters ──

CREATE TABLE IF NOT EXISTS public.topic_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_slug TEXT NOT NULL,
  cluster_slug TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  reverse_anchor_text TEXT,
  relevance_score INT DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pillar_slug, cluster_slug)
);

CREATE INDEX IF NOT EXISTS idx_topic_clusters_pillar ON public.topic_clusters(pillar_slug);
CREATE INDEX IF NOT EXISTS idx_topic_clusters_cluster ON public.topic_clusters(cluster_slug);

-- ── Internal link tracking ──

CREATE TABLE IF NOT EXISTS public.internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug TEXT NOT NULL,
  target_slug TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  link_type TEXT DEFAULT 'contextual' CHECK (link_type IN ('contextual', 'cluster', 'related', 'cta')),
  auto_injected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_slug, target_slug)
);

CREATE INDEX IF NOT EXISTS idx_internal_links_target ON public.internal_links(target_slug);

-- ── Seed pillar/cluster relationships for NemtBudget ──

INSERT INTO public.topic_clusters (pillar_slug, cluster_slug, anchor_text, reverse_anchor_text, relevance_score) VALUES
  -- Pillar: Budget / Kom i gang
  ('raadighedsbeloeb-beregning', '50-30-20-reglen-budget', 'beregn dit rådighedsbeløb', '50/30/20-reglen', 90),
  ('raadighedsbeloeb-beregning', 'noedbuffer-hvad-er-det', 'beregn dit rådighedsbeløb', 'nødbuffer guide', 85),
  ('raadighedsbeloeb-beregning', 'familiebudget-med-boern', 'beregn dit rådighedsbeløb', 'familiebudget med børn', 80),
  -- Pillar: Boligøkonomi
  ('husleje-andelsbolig-vs-eje', 'huskop-opsparing-udbetaling', 'andelsbolig vs ejerbolig', 'opsparing til udbetaling', 90),
  ('husleje-andelsbolig-vs-eje', 'boligstoette-hvem-kan-faa', 'andelsbolig vs ejerbolig', 'boligstøtte guide', 80),
  ('husleje-andelsbolig-vs-eje', 'stresstesting-privatoekonomi', 'andelsbolig vs ejerbolig', 'stresstest dit budget', 85),
  -- Pillar: Investering
  ('aktiesparekonto-guide', 'investering-begynder-maanedlig', 'aktiesparekonto guide', 'investering for begyndere', 90),
  ('aktiesparekonto-guide', 'inflationens-effekt-opsparing', 'aktiesparekonto guide', 'inflation og opsparing', 80),
  ('aktiesparekonto-guide', 'groen-investering-etf-guide', 'aktiesparekonto guide', 'grønne ETFer', 75),
  -- Pillar: Gæld
  ('gaelds-sneboldsystem', 'su-laan-afdrag-strategi', 'sneboldsystemet til gæld', 'SU-lån strategi', 85),
  -- Pillar: Skat
  ('frikort-topskattegranse-2026', 'haandvaerkerfradrag-2026', 'frikort og topskat 2026', 'håndværkerfradrag 2026', 75),
  ('frikort-topskattegranse-2026', 'aarsopgoerelse-fejl-ret-dem', 'frikort og topskat 2026', 'årsopgørelse fejl', 80),
  ('frikort-topskattegranse-2026', 'freelance-skat-moms', 'frikort og topskat 2026', 'freelancer skat', 70),
  -- Pillar: Besparelser
  ('forsikringer-du-ikke-behoever', 'dagligvarer-billigere-indkoeb', 'unødvendige forsikringer', 'billigere dagligvarer', 60),
  ('forsikringer-du-ikke-behoever', 'digitale-tjenester-overblik', 'unødvendige forsikringer', 'digitale abonnementer', 70),
  ('forsikringer-du-ikke-behoever', 'mobil-abonnement-bedste-pris', 'unødvendige forsikringer', 'mobilabonnement pris', 65),
  ('forsikringer-du-ikke-behoever', 'el-forbrug-spar-penge', 'unødvendige forsikringer', 'spar på elregningen', 60)
ON CONFLICT DO NOTHING;

-- NOTE: Cron jobs for NemtBudget are configured via GitHub Actions + Supabase Dashboard
-- Set up manually in Dashboard > Database > Cron Jobs:
--   seo-analytics-daily: 0 7 * * * → POST /functions/v1/seo-analytics {"action":"full_sync"}
--   seo-refresh-weekly:  0 8 * * 0 → POST /functions/v1/seo-refresh {"action":"auto_refresh"}
--   seo-retrolink-daily: 30 6 * * * → POST /functions/v1/seo-retrolink {"action":"auto_link"}

ALTER TABLE public.seo_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_discovered_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_links ENABLE ROW LEVEL SECURITY;
