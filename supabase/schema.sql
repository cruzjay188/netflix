-- ════════════════════════════════════════════════════════════════════════════
-- Myflix: the whole database, as it is now (rebuilt for authentication, 2026-10-19).
-- Run on an EMPTY Supabase project (SQL Editor → paste → Run) to recreate everything.
-- The same SQL, step by step, is in migrations/20261019204115…, …204211…, …204234….
--
--   auth.users 1─1 profiles 1─* list_entries *─1 shows *─1 genres
--                           1─* list_comments (each on one of your list_entries)
--                           1─* shows (created_by: your own titles; null = built-in catalog)
--                           1─* lists 1─* list_items *─1 shows
--
-- Security model
--   • Accounts are Supabase Auth email + password users (auth.users). profiles is the app's
--     "users" table: its id IS the auth.users id, and a trigger creates it on sign-up.
--   • Every user_id: not null, default auth.uid(), on delete cascade. The app never sends one.
--   • RLS is on for every table. Every policy is "to authenticated"; anon gets nothing.
--     Each user sees and changes only their own rows. The catalog (genres + shows with
--     created_by null) is read-only for every logged-in user.
--   • No database functions are called from the app (no supabase.rpc), so none are exposed.
--   • Only Supabase's own functions exist besides set_updated_at and handle_new_user.
--
-- Not included: the old test rows (they belonged to deleted anonymous accounts; see git commit c95edc9).
-- ════════════════════════════════════════════════════════════════════════════


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Step 1 · Users: profiles as the authentication table                     │
-- └──────────────────────────────────────────────────────────────────────────┘
-- Step 1: profiles is the authentication table. Its id IS the login's id (auth.users),
-- and a trigger creates the row the moment someone registers.

-- Shared helper: keeps updated_at current on any table that uses it.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id           uuid        primary key references auth.users (id) on delete cascade,
  display_name text        not null check (char_length(display_name) between 1 and 50),
  avatar_color text        not null default '#e50914' check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Runs as the table owner (security definer) because the new user can't insert their own
-- profile yet. Name = the "name" sent at sign-up, else the part of the email before the @.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Me'
    ), 50)
  );
  return new;
end;
$$;

-- Only the trigger may run it; nobody can call it through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Locked until Step 3 adds the "only your own profile" rules.
alter table public.profiles enable row level security;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Step 2 · Tables (empty, RLS on) + catalog seed                           │
-- └──────────────────────────────────────────────────────────────────────────┘
-- Step 2: recreate Myflix's tables, empty, with RLS on (locked until Step 3 adds the rules).
--   auth.users 1─1 profiles 1─* list_entries *─1 shows *─1 genres
--                           1─* list_comments (each on one of your list_entries)
--                           1─* shows (created_by: your own titles; null = built-in catalog)
--                           1─* lists 1─* list_items *─1 shows
-- Every user_id: not null, default auth.uid(), on delete cascade. The app never sends a user id.

-- ── Catalog ──
create table public.genres (
  id   smallint generated always as identity primary key,
  name text     not null unique
);

create table public.shows (
  id              text        primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),  -- kebab-case, never renamed
  title           text        not null,
  kind            text        not null default 'series' check (kind in ('series', 'movie')),
  release_year    smallint    not null check (release_year between 1900 and 2100),
  seasons         smallint    check (seasons > 0),                                   -- null for movies
  maturity_rating text        not null check (maturity_rating in ('TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA', 'G', 'PG', 'PG-13', 'R', 'NC-17')),
  synopsis        text        not null default '',
  genre_id        smallint    not null references public.genres (id),
  -- null = built-in catalog show; otherwise the user who added it (filled in by the database)
  created_by      uuid        default auth.uid() references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index shows_genre_id_idx   on public.shows (genre_id);
create index shows_created_by_idx on public.shows (created_by);

-- ── My List ──
create table public.list_entries (
  user_id    uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  show_id    text        not null references public.shows (id) on delete cascade,
  status     text        not null default 'want' check (status in ('want', 'watching', 'finished')),
  rating     smallint    not null default 0 check (rating between 0 and 5),  -- 0 = unrated
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, show_id)
);

create index list_entries_show_id_idx on public.list_entries (show_id);

create trigger list_entries_set_updated_at
  before update on public.list_entries
  for each row execute function public.set_updated_at();

create table public.list_comments (
  id         uuid        primary key,                     -- generated in the browser (crypto.randomUUID)
  user_id    uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  show_id    text        not null,
  body       text        not null check (char_length(body) between 1 and 500),
  spoiler    boolean     not null default false,
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  -- a comment sits on one of your own list entries; removing the show deletes its comments
  foreign key (user_id, show_id) references public.list_entries (user_id, show_id) on delete cascade
);

create index list_comments_user_show_idx on public.list_comments (user_id, show_id);

-- ── Named lists ("Comfort shows", "Watch with Dad", …) ──
create table public.lists (
  id         uuid        primary key,                     -- generated in the browser (crypto.randomUUID)
  user_id    uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  name       text        not null check (char_length(name) between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)                                    -- lets list_items prove its list has the same owner
);

-- No two lists with the same name for one user ("Faves" and "faves" count as the same).
create unique index lists_user_name_idx on public.lists (user_id, lower(name));

create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

create table public.list_items (
  list_id  uuid        not null,
  show_id  text        not null references public.shows (id) on delete cascade,
  user_id  uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, show_id),
  -- an item can only point at its owner's list; deleting the list deletes its items
  foreign key (list_id, user_id) references public.lists (id, user_id) on delete cascade
);

create index list_items_show_id_idx on public.list_items (show_id);

-- Every table starts locked: RLS on, no policies yet (Step 3).
alter table public.genres        enable row level security;
alter table public.shows         enable row level security;
alter table public.list_entries  enable row level security;
alter table public.list_comments enable row level security;
alter table public.lists         enable row level security;
alter table public.list_items    enable row level security;

-- ── Catalog seed (mirrors front-end/src/data/shows.js; created_by stays null) ──
insert into public.genres (name) values
  ('Sci-Fi'), ('Mystery'), ('Fantasy'), ('Adventure'), ('Sports Docuseries'),
  ('Thriller'), ('Comedy'), ('Food Docuseries'), ('Animation');

insert into public.shows (id, title, kind, release_year, seasons, maturity_rating, synopsis, genre_id, created_by) values
  ('stranger-things', 'Stranger Things', 'series', 2016, 5, 'TV-14',
   'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
   (select id from public.genres where name = 'Sci-Fi'), null),
  ('wednesday', 'Wednesday', 'series', 2022, 2, 'TV-14',
   'Smart, sarcastic and a little dead inside, Wednesday Addams investigates twisted mysteries while making new friends — and foes — at Nevermore Academy.',
   (select id from public.genres where name = 'Mystery'), null),
  ('avatar', 'Avatar: The Last Airbender', 'series', 2024, 1, 'TV-14',
   'A young boy known as the Avatar must master the four elemental powers to save a world at war and fight a ruthless enemy bent on stopping him.',
   (select id from public.genres where name = 'Fantasy'), null),
  ('one-piece', 'One Piece', 'series', 2023, 2, 'TV-14',
   'With his straw hat and ragtag crew, young pirate Monkey D. Luffy goes on an epic voyage for treasure.',
   (select id from public.genres where name = 'Adventure'), null),
  ('the-last-dance', 'The Last Dance', 'series', 2020, 1, 'TV-MA',
   'Rare footage and candid interviews tell the story of Michael Jordan and the 1990s Chicago Bulls dynasty.',
   (select id from public.genres where name = 'Sports Docuseries'), null),
  ('squid-game', 'Squid Game', 'series', 2021, 3, 'TV-MA',
   'Hundreds of cash-strapped players accept a strange invitation to compete in children’s games. Inside, a tempting prize awaits — with deadly high stakes.',
   (select id from public.genres where name = 'Thriller'), null),
  ('brooklyn-nine-nine', 'Brooklyn Nine-Nine', 'series', 2013, 8, 'TV-14',
   'Brilliant but immature Brooklyn detective Jake Peralta must learn to follow the rules and be a team player when his squad gets an exacting new captain.',
   (select id from public.genres where name = 'Comedy'), null),
  ('chefs-table', 'Chef’s Table', 'series', 2015, 7, 'TV-PG',
   'In this Emmy-nominated series, each episode takes you inside the lives and kitchens of the world’s most renowned chefs.',
   (select id from public.genres where name = 'Food Docuseries'), null),
  ('arcane', 'Arcane', 'series', 2021, 2, 'TV-14',
   'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and clashing convictions.',
   (select id from public.genres where name = 'Animation'), null),
  ('formula-1', 'Formula 1: Drive to Survive', 'series', 2019, 7, 'TV-MA',
   'Drivers, managers and team owners live life in the fast lane — both on and off the track — during each cutthroat season of Formula 1 racing.',
   (select id from public.genres where name = 'Sports Docuseries'), null);


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Step 3 · Row Level Security policies + table privileges                  │
-- └──────────────────────────────────────────────────────────────────────────┘
-- Step 3: Row Level Security. Every rule is for logged-in users ("to authenticated"), and each
-- user can only see and change their own rows. Visitors who aren't logged in (anon) get nothing.
-- (select auth.uid()) is wrapped in a select so Postgres works it out once per query, not per row.

-- ── Table privileges: start from nothing, then grant exactly what the app uses ──
revoke all on public.profiles, public.genres, public.shows, public.list_entries,
              public.list_comments, public.lists, public.list_items
  from anon, authenticated;

grant select, update                 on public.profiles      to authenticated;
grant select                         on public.genres        to authenticated;
grant select, insert, update, delete on public.shows         to authenticated;
grant select, insert, update, delete on public.list_entries  to authenticated;
grant select, insert, update, delete on public.list_comments to authenticated;
grant select, insert, update, delete on public.lists         to authenticated;
grant select, insert, update, delete on public.list_items    to authenticated;

-- ── profiles: read and edit only your own. Created by the sign-up trigger, deleted with the account ──
create policy "Users read their own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── genres: the shared catalog, read-only ──
create policy "Logged-in users read genres" on public.genres
  for select to authenticated
  using (true);

-- ── shows: the built-in catalog (created_by is null) is shared; titles you add are yours alone ──
create policy "Read the catalog and your own shows" on public.shows
  for select to authenticated
  using (created_by is null or (select auth.uid()) = created_by);

create policy "Users add their own shows" on public.shows
  for insert to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Users update their own shows" on public.shows
  for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Users delete their own shows" on public.shows
  for delete to authenticated
  using ((select auth.uid()) = created_by);

-- ── list_entries: your My List. You can only save a show you're allowed to see
--    (the subquery runs under the shows rules above, so another user's private title isn't found) ──
create policy "Users read their own list entries" on public.list_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add visible shows to their own list" on public.list_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id
              and exists (select 1 from public.shows s where s.id = show_id));

create policy "Users update their own list entries" on public.list_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id
              and exists (select 1 from public.shows s where s.id = show_id));

create policy "Users delete their own list entries" on public.list_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── list_comments: your own comments (the foreign key also ties each one to your own list entry) ──
create policy "Users manage their own comments" on public.list_comments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── lists: your own named lists ──
create policy "Users manage their own lists" on public.lists
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── list_items: only in your own lists (enforced by the foreign key) and only shows you can see ──
create policy "Users read their own list items" on public.list_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add visible shows to their own lists" on public.list_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id
              and exists (select 1 from public.shows s where s.id = show_id));

create policy "Users update their own list items" on public.list_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id
              and exists (select 1 from public.shows s where s.id = show_id));

create policy "Users delete their own list items" on public.list_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);
