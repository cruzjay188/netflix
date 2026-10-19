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
