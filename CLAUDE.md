# Myflix — CLAUDE.md

A personal version of Netflix, built for a class assignment: the catalog, rows and lists are personalized around the shows and activities the owner actually enjoys. The first section built is **My List**, where users rate (1–5★) and comment on shows they've saved. Users can also add their own movies/series and group titles into named lists.

## Stack

React 19 · Vite 8 · Vitest 5 + React Testing Library + user-event (jsdom) · plain CSS · Supabase (`@supabase/supabase-js` 2.117.0, pinned) for cloud storage, with `localStorage` as the offline copy.

## Commands

The project has two halves: `front-end/` (the React app) and `supabase/` (the database). Run every npm command inside `front-end/`. Start Claude Code in the root, where `.mcp.json` is.

```bash
cd front-end
npm run dev          # dev server → http://localhost:5173
npm test             # vitest run (all tests once)
npm run test:watch   # vitest watch mode
npm run build        # production build → dist/
npm run preview      # serve dist/
```

Supabase config lives in `front-end/.env.local` (gitignored; template in `front-end/.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Without it the app runs local-only. Restart `npm run dev` after changing it.

Before calling any change done: `npm test` and `npm run build` must both pass.

## Project layout

```
front-end/       the React app (package.json, vite.config.js, index.html, .env.local)
  app_outline/
    user_journey.md  what a user can do, page by page (read by the auth prompts)
  src/
    data/        show catalog + starter list (the ONLY place show content lives)
    utils/       pure helpers: listUtils (filter, sort, average, timeAgo), libraryUtils (show form, catalog, list names), authUtils (form checks, error messages, per-user storage keys)
    hooks/       useAuth (session + profile), useMyList (My List) and useLibrary (own titles + named lists) — reducer + localStorage + Supabase sync; useDialog
    lib/         supabase.js (client or null), auth.js (register / log in / log out / profile), session.js (write queue), listSync.js / librarySync.js (rows ⇄ state, diff, remote), tmdb.js (calls the tmdb Edge Function)
    views/       page-level components (MyList, AuthPage = Log in / Register)
    components/  reusable UI (Header, Poster, StarRating, ShowCard, ListToolbar, ShowModal, CommentSection, AddShowModal, ListsSection, ListPicker, ListNameForm, TmdbSection)
    styles/      global.css — design tokens + all styles
    test/        setup.js + *.test.js(x)
supabase/
  schema.sql   the whole current database in one file (keep it matching the live project)
  migrations/  the same SQL, step by step (applied with `npx supabase db query --linked -f <file>`; NOT `db push`, the remote history has different timestamps for Oct 16–18)
  functions/   Edge Functions (Deno): hello-world, tmdb. Deploy: `npx supabase functions deploy <name> --use-api`
  config.toml  Supabase CLI settings (linked to project xwewyxugdsabrqencnyv)
docs/
  PROJECT_MAP.md   current file-by-file map (maintained by project-mapper)
  SCHEMA.md        database ERD (Mermaid) + table reference — update with every migration
  DESIGN.md        design tokens, components, UI patterns
  research/        Mobbin research briefs, one per feature
```

Full detail: @docs/PROJECT_MAP.md

## Conventions

- **Data** goes in `src/data/shows.js`. Show `id`s are kebab-case and are the keys for saved ratings/comments — never rename an existing id.
- **Catalog mirror**: the Supabase `shows`/`genres` tables mirror `shows.js`, and `list_entries.show_id` references `shows.id`. Adding a show (or genre) to `shows.js` also needs an insert in a new migration, or cloud sync fails when that show is saved.
- **State** goes through `listReducer` (`useMyList.js`, My List) or `libraryReducer` (`useLibrary.js`, the user's own titles and named lists). Add an action type; don't add parallel `useState` copies of list data. Reducers are pure: pass `now` and generated ids in the action.
- **Catalog** on screen = `buildCatalog(library.customShows)`: the user's titles (ids start with `u-`, `custom: true`, generated poster colors) plus `SHOWS`. Use it instead of `SHOWS_BY_ID` wherever a user's title might appear.
- **Persistence**: never call Supabase from components. The hook diffs each new reducer state against the last synced one (`diffStates` in `src/lib/listSync.js`) and sends only changed rows, so a new reducer action syncs automatically. A new *field* needs: a column in a new migration file, plus the `*ToRow`/`rowsTo*` updates in `listSync.js` or `librarySync.js` and tests.
- **Write order**: every Supabase write goes through `enqueue()` in `src/lib/session.js`, one batch at a time in the order changes happened. In `views/MyList.jsx`, `useLibrary()` is called before `useMyList()` so a new title reaches the database before the My List row that points at it. Keep that order.
- **Accounts**: email + password through Supabase Auth. Only `lib/auth.js` calls `supabase.auth`; components get it through `useAuth`. `App.jsx` shows `AuthPage` until there's a session (no React Router: the page switch is state). Offline copies are stored per user (`userStorageKey`), and Log out removes them. Without Supabase configured (and in tests, unless `<App authClient={fake} />`) the app runs device-only with no accounts.
- **Database**: every table has RLS enabled; every policy is `to authenticated` with `auth.uid() = user_id` (`shows`: catalog rows have `created_by` null and are readable by logged-in users; user rows are owner-only). `anon` has no access. Every `user_id` is `not null default auth.uid()` — rows sent from the app never include `user_id`/`created_by`. Schema changes go in a new timestamped file in `supabase/migrations/` plus `supabase/schema.sql`; never edit an applied migration. Only the anon/publishable key goes in the browser, never the service-role key.
- **Components**: function components, default export, one per file, file name = component name. Pure helpers go to `src/utils/`, not inside components.
- **Styling**: use CSS custom properties from `:root` in `global.css` (`--red`, `--surface`, `--muted`, …) and BEM-ish names (`block__element`, `block--modifier`). Inline styles only for data-driven values (poster gradients). See @docs/DESIGN.md.
- **Accessibility is required**: real `<button>`/`<input>` elements with accessible names, `aria-pressed` for toggles, dialogs with `role="dialog"`, `aria-modal`, focus on open, Escape to close.
- **Tests** query by role/label (`getByRole('button', { name: '4 stars' })`), never by class name. Integration tests render `<App />`; `setup.js` clears localStorage between tests.
- **No new dependencies** without asking the user first.
- Don't commit `node_modules/` or `dist/`.

## Subagents (`.claude/agents/`)

| Agent | Model | Use it to… |
|---|---|---|
| `project-mapper` | sonnet | Map the codebase and update `docs/PROJECT_MAP.md` after changes |
| `ui-researcher` | sonnet | Search Mobbin (MCP) for reference UI and write `docs/research/<feature>.md` |
| `feature-builder` | opus | Implement features following these conventions |
| `test-writer` | sonnet | Write/fix Vitest + RTL tests |
| `code-reviewer` | opus | Read-only review for bugs, a11y, conventions |
| `content-curator` | haiku | Personalize `src/data/shows.js` around the user's interests |
| `front-end-agent` | sonnet | **Course agent** (SPA lecture). React UI work with Context7, Playwright, Chrome DevTools and the 4 design skills |
| `supabase-agent` | sonnet | **Course agent** (Databases lecture). Schema, RLS, migrations and API work through the Supabase MCP + `postgresql-table-design` |
| `qa-agent` | opus | **Course agent** (KC6). Give it a URL + feature list; it tests them in a real browser with Playwright, mobile and desktop |

The three course agents are copied word for word from the instructor's repos. Don't edit them; the class prompts expect them as-is. For multi-agent prompts from class, the main session orchestrates `front-end-agent` + `supabase-agent`.

**Feature workflow:** ui-researcher → feature-builder → test-writer → code-reviewer → project-mapper. The `/add-feature` skill walks through it.

## Skills (`.claude/skills/`)

- `/add-feature <description>` — the end-to-end feature workflow and done-checklist
- `/mobbin-research <topic>` — how to query Mobbin and the research brief template
- `/run-app` — commands to run, test, build, and reset local data
- Course design skills (SPA lecture, installed by `setup-skills.sh`): `frontend-design`, `ui-ux-pro-max`, `design-taste-frontend` (folder `taste-skill`), `design-motion-principles`
- Course database skill (Databases lecture, `setup-db-skill.sh`): `postgresql-table-design`. Use it for every schema change.

## MCP

- **Supabase**: the app uses `@supabase/supabase-js`. Claude Code also has the Supabase MCP server (`.mcp.json`, project `xwewyxugdsabrqencnyv`) for migrations, SQL and advisors — keep the files in `supabase/migrations/` and `supabase/schema.sql` in step with what you apply. Users register and log in with email + password (Authentication → Sign In / Providers: Email on, Confirm email off for development, Anonymous sign-ins off). Supabase rejects test-only email domains like `example.com`.
- **playwright**, **context7**, **chrome-devtools**: user-scoped (installed for every project per the SPA lecture). Playwright = drive a real browser; Context7 = current library docs; Chrome DevTools = console, network, performance.
- **mobbin** (`.mcp.json`, HTTP `https://api.mobbin.com/mcp`) — UI reference search. Tools: `search_screens`, `search_flows`, `search_sections`. Always use `platform: "web"` and cite results by their `mobbin_url`.

## Current status

- ✅ TMDB (Netflix Clone V, 2026-10-20): `tmdb` Edge Function (logged-in users only; TMDB key in Supabase Secrets `TMDB_API_KEY` + gitignored root `.env`, never in `VITE_` vars). Trending row + search above "Add to My List"; adding a TMDB show saves it as the user's own title (`tmdb_id`, `poster_url`, maturity `NR`) once, then puts it on My List
- ✅ Authentication (Netflix Clone IV, 2026-10-19): Register (name, email, password ≥ 6), Log in, Log out, stays logged in on refresh, name + Log out in the header; database rebuilt with owner-only RLS (`20261019…` migrations, `supabase/schema.sql`)
- ✅ Supabase sync: `list_entries` + `list_comments` + library tables, sync status shown under the title
- ✅ Schema: `profiles` (auto-created per account by `on_auth_user_created`), `genres` + `shows` catalog (read-only for logged-in users), list rows linked to both
- ✅ Your own titles: add a movie/series (form dialog), optionally straight to My List; delete it (cascades out of My List and lists)
- ✅ Named lists: create, rename, delete; add/remove titles from the Lists section or from a show's dialog
- ✅ My List: grid, rate 1–5★ (click again to clear), comments (add / edit / delete, spoiler flag, 500-char limit), watch status, filters with counts, sort, stats, add/remove shows, localStorage persistence
- ⏳ Catalog still uses placeholder shows — waiting on the owner's real interests (use `content-curator`)
- ⏳ Next sections to build: Home (hero banner + rows), search, profile
