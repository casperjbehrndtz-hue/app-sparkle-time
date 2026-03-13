-- Email opt-outs table
create table if not exists email_opt_outs (
  email text primary key,
  created_at timestamptz default now()
);

-- Rate limits table for edge functions
create table if not exists api_rate_limits (
  id text primary key,           -- "{function}:{ip}"
  count integer not null default 1,
  window_start timestamptz not null default now()
);

-- Auto-clean entries older than 2 hours
create index if not exists api_rate_limits_window_idx on api_rate_limits (window_start);
