-- Keep the administrator helper outside schemas exposed by the Data API.
create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;


-- Rebuild notice policies against the non-exposed helper.
drop policy if exists "authenticated can read allowed notices"
on public.notices;

create policy "authenticated can read allowed notices"
on public.notices
for select
to authenticated
using (
  (
    status = 'published'
    and published_at <= now()
  )
  or (select private.is_admin())
);

drop policy if exists "admin can create notices"
on public.notices;

create policy "admin can create notices"
on public.notices
for insert
to authenticated
with check (
  (select private.is_admin())
  and author_id = (select auth.uid())
);

drop policy if exists "admin can update notices"
on public.notices;

create policy "admin can update notices"
on public.notices
for update
to authenticated
using (
  (select private.is_admin())
)
with check (
  (select private.is_admin())
  and author_id = (select auth.uid())
);

drop policy if exists "admin can delete notices"
on public.notices;

create policy "admin can delete notices"
on public.notices
for delete
to authenticated
using (
  (select private.is_admin())
);


-- A public bucket can serve known object URLs without allowing bucket listing.
drop policy if exists "public can view notice images"
on storage.objects;

drop policy if exists "admin can upload notice images"
on storage.objects;

create policy "admin can upload notice images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'notice-images'
  and (select private.is_admin())
);

drop policy if exists "admin can update notice images"
on storage.objects;

create policy "admin can update notice images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'notice-images'
  and (select private.is_admin())
)
with check (
  bucket_id = 'notice-images'
  and (select private.is_admin())
);

drop policy if exists "admin can delete notice images"
on storage.objects;

create policy "admin can delete notice images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'notice-images'
  and (select private.is_admin())
);


-- Foreign-key lookups and author account deletion checks need this index.
create index if not exists notices_author_id_idx
on public.notices (author_id);


-- The browser no longer calls this helper through RPC.
drop function if exists public.is_admin();

-- Trigger functions do not need to be executable through the Data API.
revoke all on function public.set_updated_at()
from public, anon, authenticated;

grant execute on function public.set_updated_at()
to service_role;
