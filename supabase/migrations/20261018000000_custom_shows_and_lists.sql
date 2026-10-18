-- Myflix: users can add their own movies/shows and make named lists (Netflix Clone II minimum).
--   profiles 1─* shows (created_by; null = built-in catalog)
--   profiles 1─* lists 1─* list_items *─1 shows
-- Run once in Supabase → SQL Editor (paste the whole file → Run), or `supabase db push`.

-- ── Custom shows: catalog rows that belong to one user ──
alter table public.shows
  add column if not exists created_by uuid default auth.uid() references public.profiles (id) on delete cascade;

create index if not exists shows_created_by_idx on public.shows (created_by);

-- Built-in catalog: everyone can read it. Custom shows: only their creator can see or change them.
drop policy if exists "Anyone can read shows" on public.shows;
drop policy if exists "Read the catalog and your own shows" on public.shows;
create policy "Read the catalog and your own shows" on public.shows
  for select to anon, authenticated
  using (created_by is null or (select auth.uid()) = created_by);

drop policy if exists "Users add their own shows" on public.shows;
create policy "Users add their own shows" on public.shows
  for insert to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "Users update their own shows" on public.shows;
create policy "Users update their own shows" on public.shows
  for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

drop policy if exists "Users delete their own shows" on public.shows;
create policy "Users delete their own shows" on public.shows
  for delete to authenticated
  using ((select auth.uid()) = created_by);

grant insert, update, delete on public.shows to authenticated;

-- Deleting a custom show also removes it from My List (and, through list_entries, its comments).
alter table public.list_entries drop constraint if exists list_entries_show_id_fkey;
alter table public.list_entries add constraint list_entries_show_id_fkey
  foreign key (show_id) references public.shows (id) on delete cascade;

-- ── Lists: named collections ("Comfort shows", "Watch with Dad", …) ──
create table if not exists public.lists (
  id         uuid        primary key,                     -- generated in the browser (crypto.randomUUID)
  user_id    uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  name       text        not null check (char_length(name) between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)                                    -- lets list_items prove its list has the same owner
);

-- No two lists with the same name for one user ("Faves" and "faves" count as the same).
create unique index if not exists lists_user_name_idx on public.lists (user_id, lower(name));

create or replace trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

create table if not exists public.list_items (
  list_id  uuid        not null,
  show_id  text        not null references public.shows (id) on delete cascade,
  user_id  uuid        not null default auth.uid(),
  added_at timestamptz not null default now(),
  primary key (list_id, show_id),
  -- deleting a list deletes its items, and an item can only point at its owner's list
  foreign key (list_id, user_id) references public.lists (id, user_id) on delete cascade
);

create index if not exists list_items_show_id_idx on public.list_items (show_id);

alter table public.lists      enable row level security;
alter table public.list_items enable row level security;

drop policy if exists "Users manage their own lists" on public.lists;
create policy "Users manage their own lists" on public.lists
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own list items" on public.list_items;
create policy "Users manage their own list items" on public.list_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.lists      to authenticated;
grant select, insert, update, delete on public.list_items to authenticated;
