-- Add locale support for multilingual SEO articles
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'da' CHECK (locale IN ('da', 'en'));

-- Update unique constraint to allow same slug in different locales
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_slug_key;
ALTER TABLE public.articles ADD CONSTRAINT articles_slug_locale_key UNIQUE (slug, locale);

-- Index for fast locale-filtered queries
CREATE INDEX IF NOT EXISTS idx_articles_locale ON public.articles(locale, status);
