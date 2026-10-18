-- Myflix: profiles + show catalog, so the schema reads like a real streaming app.
--   auth.users 1─1 profiles 1─* list_entries *─1 shows *─1 genres
--                           1─* list_comments
-- The app UI still renders from src/data/shows.js; `shows` mirrors it so list rows can reference
-- real catalog rows. Adding a show to shows.js therefore also needs an insert in a new migration.

-- Shared trigger: keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Profiles: one per account, created automatically on sign-up (anonymous included) ──
create table if not exists public.profiles (
  id           uuid        primary key references auth.users (id) on delete cascade,
  display_name text        not null default 'Me' check (char_length(display_name) between 1 and 50),
  avatar_color text        not null default '#e50914' check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who signed up before this migration.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;

create policy "Users read their own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, update on public.profiles to authenticated;

-- ── Catalog: genres + shows (public, read-only from the browser) ──
create table if not exists public.genres (
  id   smallint generated always as identity primary key,
  name text     not null unique
);

create table if not exists public.shows (
  id              text        primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),  -- kebab-case, never renamed
  title           text        not null,
  kind            text        not null default 'series' check (kind in ('series', 'movie')),
  release_year    smallint    not null check (release_year between 1900 and 2100),
  seasons         smallint    check (seasons > 0),                                   -- null for movies
  maturity_rating text        not null check (maturity_rating in ('TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA', 'G', 'PG', 'PG-13', 'R', 'NC-17')),
  synopsis        text        not null default '',
  genre_id        smallint    not null references public.genres (id),
  created_at      timestamptz not null default now()
);

create index if not exists shows_genre_id_idx on public.shows (genre_id);

alter table public.genres enable row level security;
alter table public.shows  enable row level security;

create policy "Anyone can read genres" on public.genres for select to anon, authenticated using (true);
create policy "Anyone can read shows"  on public.shows  for select to anon, authenticated using (true);

grant select on public.genres, public.shows to anon, authenticated;

-- Seed generated from src/data/shows.js.
insert into public.genres (name) values
  ('Sci-Fi'),
  ('Mystery'),
  ('Fantasy'),
  ('Adventure'),
  ('Sports Docuseries'),
  ('Thriller'),
  ('Comedy'),
  ('Food Docuseries'),
  ('Animation')
on conflict (name) do nothing;

insert into public.shows (id, title, kind, release_year, seasons, maturity_rating, synopsis, genre_id) values
  ('stranger-things', 'Stranger Things', 'series', 2016, 5, 'TV-14',
   'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
   (select id from public.genres where name = 'Sci-Fi')),
  ('wednesday', 'Wednesday', 'series', 2022, 2, 'TV-14',
   'Smart, sarcastic and a little dead inside, Wednesday Addams investigates twisted mysteries while making new friends — and foes — at Nevermore Academy.',
   (select id from public.genres where name = 'Mystery')),
  ('avatar', 'Avatar: The Last Airbender', 'series', 2024, 1, 'TV-14',
   'A young boy known as the Avatar must master the four elemental powers to save a world at war and fight a ruthless enemy bent on stopping him.',
   (select id from public.genres where name = 'Fantasy')),
  ('one-piece', 'One Piece', 'series', 2023, 2, 'TV-14',
   'With his straw hat and ragtag crew, young pirate Monkey D. Luffy goes on an epic voyage for treasure.',
   (select id from public.genres where name = 'Adventure')),
  ('the-last-dance', 'The Last Dance', 'series', 2020, 1, 'TV-MA',
   'Rare footage and candid interviews tell the story of Michael Jordan and the 1990s Chicago Bulls dynasty.',
   (select id from public.genres where name = 'Sports Docuseries')),
  ('squid-game', 'Squid Game', 'series', 2021, 3, 'TV-MA',
   'Hundreds of cash-strapped players accept a strange invitation to compete in children’s games. Inside, a tempting prize awaits — with deadly high stakes.',
   (select id from public.genres where name = 'Thriller')),
  ('brooklyn-nine-nine', 'Brooklyn Nine-Nine', 'series', 2013, 8, 'TV-14',
   'Brilliant but immature Brooklyn detective Jake Peralta must learn to follow the rules and be a team player when his squad gets an exacting new captain.',
   (select id from public.genres where name = 'Comedy')),
  ('chefs-table', 'Chef’s Table', 'series', 2015, 7, 'TV-PG',
   'In this Emmy-nominated series, each episode takes you inside the lives and kitchens of the world’s most renowned chefs.',
   (select id from public.genres where name = 'Food Docuseries')),
  ('arcane', 'Arcane', 'series', 2021, 2, 'TV-14',
   'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and clashing convictions.',
   (select id from public.genres where name = 'Animation')),
  ('formula-1', 'Formula 1: Drive to Survive', 'series', 2019, 7, 'TV-MA',
   'Drivers, managers and team owners live life in the fast lane — both on and off the track — during each cutthroat season of Formula 1 racing.',
   (select id from public.genres where name = 'Sports Docuseries'))
on conflict (id) do nothing;

-- ── Link list data to profiles and shows ──
alter table public.list_entries
  add column if not exists updated_at timestamptz not null default now();

create or replace trigger list_entries_set_updated_at
  before update on public.list_entries
  for each row execute function public.set_updated_at();

-- user_id now points at profiles (which cascades from auth.users), so the diagram connects end to end.
alter table public.list_entries  drop constraint if exists list_entries_user_id_fkey;
alter table public.list_entries  add constraint list_entries_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.list_comments drop constraint if exists list_comments_user_id_fkey;
alter table public.list_comments add constraint list_comments_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.list_entries add constraint list_entries_show_id_fkey
  foreign key (show_id) references public.shows (id);

create index if not exists list_entries_show_id_idx on public.list_entries (show_id);
