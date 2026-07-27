-- Optimize notice RLS checks while preserving existing permissions.

drop policy if exists "admin can read own profile"
on public.admin_users;

create policy "admin can read own profile"
on public.admin_users
for select
to authenticated
using (user_id = (select auth.uid()));


drop policy if exists "public can read published notices"
on public.notices;

drop policy if exists "admin can read all notices"
on public.notices;

drop policy if exists "authenticated can read allowed notices"
on public.notices;

create policy "public can read published notices"
on public.notices
for select
to anon
using (
  status = 'published'
  and published_at <= now()
);

create policy "authenticated can read allowed notices"
on public.notices
for select
to authenticated
using (
  (
    status = 'published'
    and published_at <= now()
  )
  or (select public.is_admin())
);


drop policy if exists "admin can create notices"
on public.notices;

create policy "admin can create notices"
on public.notices
for insert
to authenticated
with check (
  (select public.is_admin())
  and author_id = (select auth.uid())
);


drop policy if exists "admin can update notices"
on public.notices;

create policy "admin can update notices"
on public.notices
for update
to authenticated
using (
  (select public.is_admin())
)
with check (
  (select public.is_admin())
  and author_id = (select auth.uid())
);


drop policy if exists "admin can delete notices"
on public.notices;

create policy "admin can delete notices"
on public.notices
for delete
to authenticated
using (
  (select public.is_admin())
);