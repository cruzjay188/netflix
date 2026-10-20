-- Netflix Clone V (AI-9): titles from TMDB.
-- A user who adds a TMDB show gets their own row in shows (created_by = them), the same way
-- as a title they type in by hand, plus the two TMDB columns below. No RLS policy changes.

-- TMDB's id for the show and its poster image (both null for hand-made and catalog titles).
alter table public.shows
  add column tmdb_id    integer check (tmdb_id > 0),
  add column poster_url text    check (poster_url like 'https://image.tmdb.org/%');

-- A user saves each TMDB show once. Nulls never clash, so other titles aren't affected.
alter table public.shows
  add constraint shows_created_by_tmdb_id_key unique (created_by, tmdb_id);

-- TMDB's lists don't include a maturity rating, so allow 'NR' (Not Rated).
alter table public.shows drop constraint shows_maturity_rating_check;
alter table public.shows add constraint shows_maturity_rating_check
  check (maturity_rating in ('TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA', 'G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'));

-- TMDB's TV genres (https://api.themoviedb.org/3/genre/tv/list). Animation, Comedy and
-- Mystery already exist.
insert into public.genres (name) values
  ('Action & Adventure'), ('Crime'), ('Documentary'), ('Drama'), ('Family'), ('Kids'), ('News'),
  ('Reality'), ('Sci-Fi & Fantasy'), ('Soap'), ('Talk'), ('War & Politics'), ('Western')
on conflict (name) do nothing;
