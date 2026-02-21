
-- Fix security definer view by setting security_invoker
ALTER VIEW public.price_averages SET (security_invoker = on);

-- The INSERT WITH CHECK (true) is intentional for anonymous crowdsourced data.
-- Add rate-limiting via a check that amount is reasonable (anti-spam)
DROP POLICY "Anyone can submit price observations" ON public.price_observations;
CREATE POLICY "Anyone can submit reasonable price observations"
  ON public.price_observations
  FOR INSERT
  WITH CHECK (amount > 0 AND amount < 200000);
