-- Reminder subscribers: anonymous email capture for financial calendar
-- No auth required — insert-only from anon role

create table if not exists public.reminder_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text not null default 'da',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz,

  -- prevent duplicates
  constraint reminder_subscribers_email_key unique (email)
);

-- Index for querying active subscribers
create index if not exists idx_reminder_subscribers_active
  on public.reminder_subscribers (email)
  where unsubscribed_at is null;

-- RLS: anon can insert only, no read/update/delete
alter table public.reminder_subscribers enable row level security;

create policy "Anon can subscribe"
  on public.reminder_subscribers
  for insert
  to anon
  with check (true);

-- Service role (edge functions) can read all for sending
create policy "Service can read all"
  on public.reminder_subscribers
  for select
  to service_role
  using (true);

-- Service role can update (for unsubscribe)
create policy "Service can update"
  on public.reminder_subscribers
  for update
  to service_role
  using (true);
