-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  Fix articles table + seo_performance schema mismatches                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Add keywords column to articles (needed for internal linking + SEO refresh)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- seo_performance: edge function writes site_url + page_url but table only has url
-- Rename url → page_url and add site_url
ALTER TABLE public.seo_performance RENAME COLUMN url TO page_url;
ALTER TABLE public.seo_performance ADD COLUMN IF NOT EXISTS site_url TEXT DEFAULT 'https://nemtbudget.nu';

-- seo_discovered_keywords: edge function writes keyword but table has query
ALTER TABLE public.seo_discovered_keywords RENAME COLUMN query TO keyword;
