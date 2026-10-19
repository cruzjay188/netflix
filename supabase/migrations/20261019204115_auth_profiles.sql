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
