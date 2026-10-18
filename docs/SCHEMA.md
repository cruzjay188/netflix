# Database schema

Supabase (Postgres) schema for Myflix. The source of truth is the SQL in [`supabase/migrations/`](../supabase/migrations/); this page explains it. GitHub renders the diagram below; in VS Code, use a Mermaid preview extension, or open **Supabase → Database → Schema Visualizer**.

## Entity-relationship diagram

```mermaid
erDiagram
    auth_users ||--|| profiles : "has one"
    profiles ||--o{ list_entries : "saves"
    profiles ||--o{ list_comments : "writes"
    list_entries ||--o{ list_comments : "has"
    shows ||--o{ list_entries : "appears in"
    genres ||--o{ shows : "categorizes"

    auth_users {
        uuid id PK "managed by Supabase Auth (anonymous sign-in)"
    }

    profiles {
        uuid id PK, FK "= auth.users.id"
        text display_name "1-50 chars, default 'Me'"
        text avatar_color "hex, default #e50914"
        timestamptz created_at
        timestamptz updated_at "set by trigger"
    }

    genres {
        smallint id PK "identity"
        text name UK
    }

    shows {
        text id PK "kebab-case, matches src/data/shows.js"
        text title
        text kind "series | movie"
        smallint release_year
        smallint seasons "null for movies"
        text maturity_rating "TV-Y ... TV-MA, G ... NC-17"
        text synopsis
        smallint genre_id FK
        timestamptz created_at
    }

    list_entries {
        uuid user_id PK, FK "profiles.id"
        text show_id PK, FK "shows.id"
        text status "want | watching | finished"
        smallint rating "0 = unrated, 1-5"
        timestamptz added_at
        timestamptz updated_at "set by trigger"
    }

    list_comments {
        uuid id PK "generated in the browser"
        uuid user_id FK "profiles.id"
        text show_id FK "with user_id -> list_entries"
        text body "1-500 chars"
        boolean spoiler
        timestamptz created_at
        timestamptz edited_at "null until edited"
    }
```

## Tables

| Table | One row per | Who can access it (RLS) |
|---|---|---|
| `profiles` | user account; created automatically on sign-up by the `on_auth_user_created` trigger | Owner reads and updates their own row |
| `genres` | genre | Everyone reads; no writes from the browser |
| `shows` | title in the catalog (mirrors `src/data/shows.js`) | Everyone reads; no writes from the browser |
| `list_entries` | show a user saved to My List | Owner only (`auth.uid() = user_id`) |
| `list_comments` | comment a user left on a saved show | Owner only (`auth.uid() = user_id`) |

## Relationships and rules

- **auth.users → profiles (1:1)**: deleting an account deletes its profile, and everything below cascades from it.
- **profiles → list_entries / list_comments (1:N)**: `on delete cascade`.
- **list_entries → list_comments (1:N)**: comments reference `(user_id, show_id)`; removing a show from My List deletes its comments.
- **shows → list_entries (1:N)**: a list row must point at a real catalog show. Adding a show to `src/data/shows.js` also needs an insert in a new migration.
- **genres → shows (1:N)**: each show has one genre.
- `updated_at` columns are maintained by the `set_updated_at()` trigger.

## How the app maps to it

`src/lib/listSync.js` converts between reducer state and rows: `entryToRow` / `commentToRow` going up, `rowsToState` coming down. The app reads and writes only `list_entries` and `list_comments`; show details on screen still come from `src/data/shows.js`.

## Migrations

| File | Adds |
|---|---|
| `20261016000000_my_list.sql` | `list_entries`, `list_comments`, RLS policies |
| `20261016190000_profiles_catalog.sql` | `profiles` (+ sign-up trigger), `genres`, `shows` (+ seed), foreign keys, `updated_at` triggers |

To set up a fresh Supabase project, run them in order in the SQL Editor, or with the Supabase CLI: `supabase db push`.
