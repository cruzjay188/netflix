-- Myflix: My List storage (one row per saved show + one row per comment).
-- Run once in Supabase → SQL Editor, or with the Supabase CLI: `supabase db push`.
-- Every row belongs to the signed-in user (anonymous sign-ins count) and RLS keeps users apart.

create table if not exists public.list_entries (
  user_id   uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  show_id   text        not null,                         -- matches ids in src/data/shows.js
  status    text        not null default 'want' check (status in ('want', 'watching', 'finished')),
  rating    smallint    not null default 0 check (rating between 0 and 5),  -- 0 = unrated
  added_at  timestamptz not null default now(),
  primary key (user_id, show_id)
);

create table if not exists public.list_comments (
  id         uuid        primary key,                     -- generated in the browser (crypto.randomUUID)
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  show_id    text        not null,
  body       text        not null check (char_length(body) between 1 and 500),
  spoiler    boolean     not null default false,
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  -- deleting a show from the list deletes its comments
  foreign key (user_id, show_id) references public.list_entries (user_id, show_id) on delete cascade
);

create index if not exists list_comments_user_show_idx on public.list_comments (user_id, show_id);

alter table public.list_entries  enable row level security;
alter table public.list_comments enable row level security;

drop policy if exists "Users manage their own list entries" on public.list_entries;
create policy "Users manage their own list entries" on public.list_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own comments" on public.list_comments;
create policy "Users manage their own comments" on public.list_comments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.list_entries  to authenticated;
grant select, insert, update, delete on public.list_comments to authenticated;
