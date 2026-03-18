-- Short links for shared budgets
create table if not exists shared_budgets (
  id text primary key,                     -- 8-char nanoid
  payload text not null,                   -- compressed+encoded budget string
  created_at timestamptz default now(),
  views integer default 0
);

-- Index for cleanup of old shares (optional cron)
create index if not exists idx_shared_budgets_created
  on shared_budgets (created_at);

-- RLS: anyone can read, edge function inserts via service role
alter table shared_budgets enable row level security;

create policy "Anyone can read shared budgets"
  on shared_budgets for select
  using (true);

-- Atomic view counter
create or replace function increment_shared_views(share_id text)
returns void language sql security definer as $$
  update shared_budgets set views = views + 1 where id = share_id;
$$;
