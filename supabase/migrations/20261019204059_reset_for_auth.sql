-- Step 0: empty the project before rebuilding it with authentication.
-- Removes Myflix's tables and the functions made for them. Supabase's own functions are left alone.
-- The rows that were here are saved in supabase/backups/myflix_backup_2026-10-19.json (not re-imported).

-- The sign-up trigger lives on auth.users, so it isn't dropped with the tables.
drop trigger if exists on_auth_user_created on auth.users;

-- One statement, so the foreign keys between these tables don't block the drop.
-- No CASCADE: if anything unexpected depends on these tables, this fails instead of silently removing it.
drop table if exists
  public.list_items,
  public.lists,
  public.list_comments,
  public.list_entries,
  public.shows,
  public.genres,
  public.profiles;

drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();

-- Old anonymous test accounts: no email or password, so nobody can log in as them.
delete from auth.users where is_anonymous;
