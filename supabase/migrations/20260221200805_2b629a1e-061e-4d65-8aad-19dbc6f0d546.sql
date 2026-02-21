
-- Anonymous crowdsourced price observations
CREATE TABLE public.price_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,          -- e.g. 'rent', 'netflix', 'electricity', 'car_insurance'
  postal_code TEXT,                -- nullable, for location-specific data
  household_type TEXT NOT NULL,    -- 'solo' or 'par'
  amount INTEGER NOT NULL,         -- monthly amount in DKK
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast aggregation queries
CREATE INDEX idx_price_obs_category_postal ON public.price_observations (category, postal_code);
CREATE INDEX idx_price_obs_category_household ON public.price_observations (category, household_type);

-- Enable RLS
ALTER TABLE public.price_observations ENABLE ROW LEVEL SECURITY;

-- Anyone can insert anonymous observations (no auth required)
CREATE POLICY "Anyone can submit price observations"
  ON public.price_observations
  FOR INSERT
  WITH CHECK (true);

-- Anyone can read aggregated data
CREATE POLICY "Anyone can read price observations"
  ON public.price_observations
  FOR SELECT
  USING (true);

-- Aggregated view for fast lookups
CREATE OR REPLACE VIEW public.price_averages AS
SELECT
  category,
  postal_code,
  household_type,
  ROUND(AVG(amount))::INTEGER AS avg_amount,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount))::INTEGER AS median_amount,
  COUNT(*) AS observation_count,
  ROUND(STDDEV(amount))::INTEGER AS stddev_amount
FROM public.price_observations
WHERE created_at > now() - INTERVAL '6 months'
GROUP BY category, postal_code, household_type
HAVING COUNT(*) >= 5;
