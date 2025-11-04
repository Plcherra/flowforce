create extension if not exists "pgcrypto";

create table if not exists company_update_engagement (
  id uuid primary key default gen_random_uuid(),
  update_id uuid references company_updates(id) on delete cascade,
  company_id uuid references companies(id),
  likes_count int default 0,
  comments_count int default 0,
  views_count int default 0,
  engagement_score numeric default 0,
  sentiment_score numeric,
  ai_summary text,
  last_analyzed timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table company_update_engagement enable row level security;

create policy "Allow company-level read/write" on company_update_engagement
for all using (
  auth.uid() in (
    select id from profiles where company_id = company_update_engagement.company_id
  )
) with check (
  auth.uid() in (
    select id from profiles where company_id = company_update_engagement.company_id
  )
);
