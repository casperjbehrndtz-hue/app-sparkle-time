-- ─── Lock down partners table ─────────────────────────────────────────────
-- Service role bypasses RLS automatically; anon/authenticated get no access
create policy "No direct access to partners"
  on partners for all
  using (false)
  with check (false);

-- ─── Lock down partner_events reads ───────────────────────────────────────
-- Events can be inserted by anyone (tracking), but never read via anon key
create policy "No direct read of partner events"
  on partner_events for select
  using (false);

-- ─── Data retention: auto-delete partner events older than 90 days ────────
-- Runs via pg_cron if available, otherwise handled in edge function
create or replace function delete_old_partner_events()
returns void language sql as $$
  delete from partner_events where created_at < now() - interval '90 days';
$$;

-- ─── Article drafts: no direct reads ──────────────────────────────────────
-- Drafts are only accessible via get-drafts edge function (service role)
create policy "No direct read of article drafts"
  on article_drafts for select
  using (false);

-- ─── Input validation: ensure postal codes in price observations are valid ─
alter table price_observations
  add constraint valid_postal_code
  check (postal_code is null or postal_code ~ '^\d{4}$');

-- ─── Limit price observations batch spam ──────────────────────────────────
-- Max 50 observations per source IP is enforced in edge function,
-- but also add DB constraint: amounts must be within reasonable Danish ranges
alter table price_observations
  add constraint reasonable_amount
  check (amount > 100 and amount < 150000);
