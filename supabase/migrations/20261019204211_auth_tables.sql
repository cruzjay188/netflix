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
