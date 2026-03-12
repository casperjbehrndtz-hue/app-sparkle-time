-- Partners (B2B clients)
create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand_key text not null,
  token text unique not null default gen_random_uuid()::text,
  created_at timestamptz default now()
);

-- Anonymous engagement events per partner
create table partner_events (
  id uuid primary key default gen_random_uuid(),
  brand_key text not null,
  event_type text not null,
  -- event_type: 'onboarding_start' | 'onboarding_complete' | 'dashboard_view'
  --             | 'ai_chat_open' | 'ai_message_sent' | 'report_generated'
  session_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Index for fast partner dashboard queries
create index partner_events_brand_key_idx on partner_events(brand_key);
create index partner_events_created_at_idx on partner_events(created_at);

-- RLS
alter table partners enable row level security;
alter table partner_events enable row level security;

-- Anyone can insert events (anonymous tracking)
create policy "Anyone can insert events"
  on partner_events for insert
  with check (true);

-- Service role handles everything else
