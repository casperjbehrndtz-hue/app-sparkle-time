-- Published articles table
create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null,
  category text not null,
  read_time text not null,
  content text not null,
  icon_name text default 'FileText',
  status text default 'published' check (status in ('published', 'draft')),
  published_at timestamptz default now(),
  created_at timestamptz default now()
);

-- AI-generated drafts awaiting review
create table article_drafts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text not null,
  category text not null,
  read_time text not null,
  content text not null,
  keywords text[] default '{}',
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

-- Enable RLS
alter table articles enable row level security;
alter table article_drafts enable row level security;

-- Anyone can read published articles
create policy "Public can read published articles"
  on articles for select
  using (status = 'published');

-- Edge functions (service role) bypass RLS automatically
-- No additional policies needed for internal writes
