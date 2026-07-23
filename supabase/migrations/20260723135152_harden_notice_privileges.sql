-- Apply least-privilege access to notice-related objects.

revoke all on table public.admin_users
from anon, authenticated;

grant select on table public.admin_users
to authenticated;


revoke all on table public.notices
from anon, authenticated;

grant select on table public.notices
to anon;

grant select, insert, update, delete on table public.notices
to authenticated;


revoke all on table public.games
from anon, authenticated;

grant select on table public.games
to anon, authenticated;


revoke all on function public.is_admin()
from public, anon;

grant execute on function public.is_admin()
to authenticated, service_role;


-- Future public objects must receive permissions explicitly.
alter default privileges for role postgres in schema public
revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
revoke all on functions from anon, authenticated;