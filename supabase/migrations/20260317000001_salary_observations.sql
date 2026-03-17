-- Anonymized salary observations from payslip OCR (opt-in)
create table if not exists salary_observations (
  id uuid primary key default gen_random_uuid(),
  industry text not null,              -- e.g. "IT", "Sundhed", "Finans"
  region text not null,                -- e.g. "Storkøbenhavn", "Østjylland"
  gross_monthly integer not null check (gross_monthly between 15000 and 200000),
  net_monthly integer not null check (net_monthly between 8000 and 150000),
  tax_pct numeric(4,1) check (tax_pct between 25 and 55),
  pension_pct numeric(4,1) check (pension_pct between 0 and 25),
  created_at timestamptz default now()
);

-- Index for aggregation queries
create index if not exists idx_salary_obs_industry on salary_observations (industry);
create index if not exists idx_salary_obs_region on salary_observations (region);

-- RLS: anyone can insert (anonymous), anyone can read aggregates
alter table salary_observations enable row level security;

create policy "Anyone can insert salary observations"
  on salary_observations for insert
  with check (true);

create policy "Anyone can read salary observations"
  on salary_observations for select
  using (true);

-- Aggregated view: only show groups with 5+ observations (privacy)
create or replace view salary_percentiles as
select
  industry,
  region,
  count(*) as sample_size,
  percentile_cont(0.25) within group (order by gross_monthly) as gross_p25,
  percentile_cont(0.50) within group (order by gross_monthly) as gross_median,
  percentile_cont(0.75) within group (order by gross_monthly) as gross_p75,
  percentile_cont(0.50) within group (order by net_monthly) as net_median,
  round(avg(tax_pct)::numeric, 1) as avg_tax_pct,
  round(avg(pension_pct)::numeric, 1) as avg_pension_pct
from salary_observations
where created_at > now() - interval '12 months'
group by industry, region
having count(*) >= 5;
