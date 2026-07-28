-- Shared game catalog for notices.
create table public.games (
  game_key text primary key,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint games_game_key_format_check
    check (game_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  constraint games_name_not_blank_check
    check (char_length(btrim(name)) between 1 and 80)
);

insert into public.games (game_key, name)
values
  ('zomboid', 'Project Zomboid'),
  ('valheim', 'Valheim');

alter table public.games enable row level security;

create policy "public can read games"
on public.games
for select
to anon, authenticated
using (true);

grant select on public.games to anon, authenticated;

-- Keep the current Zomboid admin page working during the transition.
alter table public.notices
  add column game_key text not null default 'zomboid';

alter table public.notices
  add constraint notices_game_key_fkey
  foreign key (game_key)
  references public.games (game_key)
  on update cascade
  on delete restrict;

-- Supports game-filtered public notice queries.
create index notices_game_public_order_idx
  on public.notices (
    game_key,
    status,
    is_pinned desc,
    published_at desc
  );