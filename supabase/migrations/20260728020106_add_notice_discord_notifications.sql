-- Send one Discord notification when a notice becomes immediately public.
-- Existing published notices are intentionally not backfilled.
-- Future publication timestamps are not scheduled or dispatched automatically.

create extension if not exists pg_net
with schema extensions;

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table if not exists private.notice_discord_deliveries (
  notice_id uuid primary key
    references public.notices (id)
    on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notice_discord_deliveries_status_check
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  constraint notice_discord_deliveries_attempt_count_check
    check (attempt_count >= 0)
);

revoke all on table private.notice_discord_deliveries
from public, anon, authenticated;

grant select, insert, update, delete
on table private.notice_discord_deliveries
to service_role;


create or replace function private.notice_dispatch_token_is_valid(
  p_dispatch_token text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_dispatch_token is not null
    and char_length(p_dispatch_token) >= 32
    and exists (
      select 1
      from vault.decrypted_secrets
      where name = 'notice_discord_dispatch_token'
        and decrypted_secret = p_dispatch_token
    );
$$;

revoke all on function private.notice_dispatch_token_is_valid(text)
from public, anon, authenticated;

grant execute on function private.notice_dispatch_token_is_valid(text)
to service_role;


create or replace function public.claim_notice_discord_delivery(
  p_notice_id uuid,
  p_dispatch_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
begin
  if not private.notice_dispatch_token_is_valid(p_dispatch_token) then
    raise insufficient_privilege using message = 'Invalid notice dispatch token.';
  end if;

  update private.notice_discord_deliveries as delivery
  set
    status = 'processing',
    attempt_count = delivery.attempt_count + 1,
    last_error = null,
    updated_at = now()
  from public.notices as notice
  join public.games as game
    on game.game_key = notice.game_key
  where delivery.notice_id = p_notice_id
    and delivery.notice_id = notice.id
    and delivery.status = 'pending'
    and notice.status = 'published'
    and notice.published_at <= now()
  returning jsonb_build_object(
    'id', notice.id,
    'game_key', notice.game_key,
    'game_name', game.name,
    'category', notice.category,
    'title', notice.title,
    'summary', notice.summary,
    'content', notice.content,
    'cover_image_url', notice.cover_image_url,
    'published_at', notice.published_at,
    'author_name', notice.author_name
  )
  into v_payload;

  return v_payload;
end;
$$;

revoke all on function public.claim_notice_discord_delivery(uuid, text)
from public, anon, authenticated;

grant execute on function public.claim_notice_discord_delivery(uuid, text)
to service_role;


create or replace function public.finish_notice_discord_delivery(
  p_notice_id uuid,
  p_dispatch_token text,
  p_succeeded boolean,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated boolean;
begin
  if not private.notice_dispatch_token_is_valid(p_dispatch_token) then
    raise insufficient_privilege using message = 'Invalid notice dispatch token.';
  end if;

  update private.notice_discord_deliveries
  set
    status = case when p_succeeded then 'sent' else 'failed' end,
    sent_at = case when p_succeeded then now() else null end,
    last_error = case
      when p_succeeded then null
      else left(coalesce(p_error, 'Unknown Discord delivery error.'), 1000)
    end,
    updated_at = now()
  where notice_id = p_notice_id
    and status = 'processing';

  v_updated := found;
  return v_updated;
end;
$$;

revoke all on function public.finish_notice_discord_delivery(
  uuid,
  text,
  boolean,
  text
)
from public, anon, authenticated;

grant execute on function public.finish_notice_discord_delivery(
  uuid,
  text,
  boolean,
  text
)
to service_role;


create or replace function private.enqueue_notice_discord_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_function_url text;
  v_dispatch_token text;
  v_should_dispatch boolean := false;
begin
  if new.status <> 'published' or new.published_at > now() then
    update private.notice_discord_deliveries
    set
      status = 'cancelled',
      updated_at = now()
    where notice_id = new.id
      and status in ('pending', 'failed');

    return new;
  end if;

  insert into private.notice_discord_deliveries (
    notice_id,
    status,
    last_error,
    updated_at
  )
  values (
    new.id,
    'pending',
    null,
    now()
  )
  on conflict (notice_id) do update
  set
    status = 'pending',
    last_error = null,
    updated_at = now()
  where private.notice_discord_deliveries.status in ('failed', 'cancelled')
    or (
      private.notice_discord_deliveries.status = 'pending'
      and private.notice_discord_deliveries.updated_at < now() - interval '1 minute'
    )
    or (
      private.notice_discord_deliveries.status = 'processing'
      and private.notice_discord_deliveries.updated_at < now() - interval '5 minutes'
    )
  returning true
  into v_should_dispatch;

  if not coalesce(v_should_dispatch, false) then
    return new;
  end if;

  select
    max(decrypted_secret) filter (
      where name = 'notice_discord_function_url'
    ),
    max(decrypted_secret) filter (
      where name = 'notice_discord_dispatch_token'
    )
  into
    v_function_url,
    v_dispatch_token
  from vault.decrypted_secrets
  where name in (
    'notice_discord_function_url',
    'notice_discord_dispatch_token'
  );

  if v_function_url is null or v_dispatch_token is null then
    update private.notice_discord_deliveries
    set
      status = 'failed',
      last_error = 'Discord notification runtime configuration is missing.',
      updated_at = now()
    where notice_id = new.id;

    return new;
  end if;

  begin
    perform net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notice-dispatch-token', v_dispatch_token
      ),
      body := jsonb_build_object(
        'notice_id', new.id
      ),
      timeout_milliseconds := 5000
    );
  exception
    when others then
      update private.notice_discord_deliveries
      set
        status = 'failed',
        last_error = left(sqlerrm, 1000),
        updated_at = now()
      where notice_id = new.id;

      raise warning 'Could not queue Discord notice delivery for %: %',
        new.id,
        sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function private.enqueue_notice_discord_delivery()
from public, anon, authenticated;


drop trigger if exists enqueue_notice_discord_delivery
on public.notices;

create trigger enqueue_notice_discord_delivery
after insert or update of status, published_at, title, summary, content,
  cover_image_url, category, game_key
on public.notices
for each row
execute function private.enqueue_notice_discord_delivery();
