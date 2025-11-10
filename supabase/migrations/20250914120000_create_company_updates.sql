create extension if not exists "pgcrypto";

create table if not exists public.company_updates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  body text not null,
  rich_content text,
  update_type text not null default 'announcement',
  priority text not null default 'medium',
  status text not null default 'draft',
  background_style jsonb,
  recipients jsonb,
  publishing_settings jsonb,
  assigned_employees jsonb,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text,
  author_role text,
  author_avatar text,
  publish_date timestamptz,
  scheduled_date timestamptz,
  is_pinned boolean not null default false,
  likes_count int not null default 0,
  comments_count int not null default 0,
  views_count int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_updates_company_idx on public.company_updates (company_id);
create index if not exists company_updates_status_idx on public.company_updates (status);
create index if not exists company_updates_publish_date_idx on public.company_updates (publish_date desc);

create trigger company_updates_set_updated_at
before update on public.company_updates
for each row
execute function public.set_updated_at();

alter table public.company_updates enable row level security;

create policy "company members can read updates"
on public.company_updates
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_updates.company_id
  )
);

create policy "company members can insert updates"
on public.company_updates
for insert
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_updates.company_id
  )
);

create policy "company members can update updates"
on public.company_updates
for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_updates.company_id
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_updates.company_id
  )
);

create policy "company members can delete updates"
on public.company_updates
for delete
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_updates.company_id
  )
);

create table if not exists public.company_update_comments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.company_updates(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  likes_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_update_comments_update_idx on public.company_update_comments (update_id);

create trigger company_update_comments_set_updated_at
before update on public.company_update_comments
for each row execute function public.set_updated_at();

alter table public.company_update_comments enable row level security;

create policy "company members can read comments"
on public.company_update_comments
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_update_comments.company_id
  )
);

create policy "company members can insert comments"
on public.company_update_comments
for insert
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_update_comments.company_id
  )
);

create policy "company members can update comments"
on public.company_update_comments
for update
using (
  company_update_comments.author_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_update_comments.company_id
      and profiles.role in ('owner','company_admin','admin','manager')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_update_comments.company_id
  )
);

create policy "company members can delete comments"
on public.company_update_comments
for delete
using (
  company_update_comments.author_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_update_comments.company_id
      and profiles.role in ('owner','company_admin','admin','manager')
  )
);

create table if not exists public.company_update_reactions (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.company_updates(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'like',
  created_at timestamptz not null default now(),
  unique (update_id, user_id, reaction_type)
);

create index if not exists company_update_reactions_update_idx on public.company_update_reactions (update_id);

alter table public.company_update_reactions enable row level security;

create policy "company members can read reactions"
on public.company_update_reactions
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_update_reactions.company_id
  )
);

create policy "company members manage reactions"
on public.company_update_reactions
for all
using (
  company_update_reactions.user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_update_reactions.company_id
      and profiles.role in ('owner','company_admin','admin','manager')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.company_id = company_update_reactions.company_id
  )
);

create or replace function public.sync_company_update_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.company_updates
      set comments_count = comments_count + 1
    where id = NEW.update_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.company_updates
      set comments_count = greatest(comments_count - 1, 0)
    where id = OLD.update_id;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger company_update_comments_count_sync
after insert or delete on public.company_update_comments
for each row
execute function public.sync_company_update_comment_count();

create or replace function public.sync_company_update_reaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    if (NEW.reaction_type = 'like') then
      update public.company_updates
        set likes_count = likes_count + 1
      where id = NEW.update_id;
    elsif (NEW.reaction_type = 'view') then
      update public.company_updates
        set views_count = views_count + 1
      where id = NEW.update_id;
    end if;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    if (OLD.reaction_type = 'like') then
      update public.company_updates
        set likes_count = greatest(likes_count - 1, 0)
      where id = OLD.update_id;
    end if;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger company_update_reactions_sync
after insert or delete on public.company_update_reactions
for each row execute function public.sync_company_update_reaction_counts();
