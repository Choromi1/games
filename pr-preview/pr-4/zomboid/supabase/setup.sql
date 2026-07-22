-- Choromi Project Zomboid notice system
-- Run the entire file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Choromi',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'notice'
    check (category in ('notice', 'important', 'update', 'maintenance', 'event')),
  title varchar(120) not null,
  summary varchar(300) not null default '',
  content text not null,
  cover_image_url text not null default '',
  is_pinned boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  published_at timestamptz not null default now(),
  author_id uuid not null references auth.users(id) on delete restrict,
  author_name varchar(80) not null default 'Choromi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notices_public_order_idx
  on public.notices (status, is_pinned desc, published_at desc);
create index if not exists notices_category_idx
  on public.notices (category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notices_set_updated_at on public.notices;
create trigger notices_set_updated_at
before update on public.notices
for each row execute function public.set_updated_at();

alter table public.notices enable row level security;

-- Policies are recreated so rerunning this file is safe.
drop policy if exists "admin can read own profile" on public.admin_users;
create policy "admin can read own profile"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "public can read published notices" on public.notices;
create policy "public can read published notices"
on public.notices
for select
to anon, authenticated
using (status = 'published' and published_at <= now());

drop policy if exists "admin can read all notices" on public.notices;
create policy "admin can read all notices"
on public.notices
for select
to authenticated
using (public.is_admin());

drop policy if exists "admin can create notices" on public.notices;
create policy "admin can create notices"
on public.notices
for insert
to authenticated
with check (public.is_admin() and author_id = auth.uid());

drop policy if exists "admin can update notices" on public.notices;
create policy "admin can update notices"
on public.notices
for update
to authenticated
using (public.is_admin())
with check (public.is_admin() and author_id = auth.uid());

drop policy if exists "admin can delete notices" on public.notices;
create policy "admin can delete notices"
on public.notices
for delete
to authenticated
using (public.is_admin());

grant select on public.notices to anon;
grant select, insert, update, delete on public.notices to authenticated;
grant select on public.admin_users to authenticated;

-- Public image bucket used by notice cover images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notice-images',
  'notice-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view notice images" on storage.objects;
create policy "public can view notice images"
on storage.objects
for select
to public
using (bucket_id = 'notice-images');

drop policy if exists "admin can upload notice images" on storage.objects;
create policy "admin can upload notice images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'notice-images' and public.is_admin());

drop policy if exists "admin can update notice images" on storage.objects;
create policy "admin can update notice images"
on storage.objects
for update
to authenticated
using (bucket_id = 'notice-images' and public.is_admin())
with check (bucket_id = 'notice-images' and public.is_admin());

drop policy if exists "admin can delete notice images" on storage.objects;
create policy "admin can delete notice images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'notice-images' and public.is_admin());

-- Enable Realtime for instant notice refresh. Skip if already added.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notices'
  ) then
    alter publication supabase_realtime add table public.notices;
  end if;
end $$;

-- NEXT STEP (run after creating the Auth user in the dashboard):
-- Replace the email and run this statement separately.
--
-- insert into public.admin_users (user_id, display_name)
-- select id, 'Choromi'
-- from auth.users
-- where email = 'YOUR_ADMIN_EMAIL@example.com'
-- on conflict (user_id) do update set display_name = excluded.display_name;
