# Myflix — CLAUDE.md

A personal version of Netflix, built for a class assignment: the catalog, rows and lists are personalized around the shows and activities the owner actually enjoys. The first section built is **My List**, where users rate (1–5★) and comment on shows they've saved. Users can also add their own movies/series and group titles into named lists.

## Stack

React 19 · Vite 8 · Vitest 5 + React Testing Library + user-event (jsdom) · plain CSS · Supabase (`@supabase/supabase-js` 2.117.0, pinned) for cloud storage, with `localStorage` as the offline copy.

## Commands

```bash
npm run dev          # dev server → http://localhost:5173
npm test             # vitest run (all tests once)
npm run test:watch   # vitest watch mode
npm run build        # production build → dist/
npm run preview      # serve dist/
```

Supabase config lives in `.env.local` (gitignored; template in `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Without it the app runs local-only. Restart `npm run dev` after changing it.

Before calling any change done: `npm test` and `npm run build` must both pass.

## Project layout

```
src/
  data/        show catalog + starter list (the ONLY place show content lives)
  utils/       pure helpers: listUtils (filter, sort, average, timeAgo) and libraryUtils (show form, catalog, list names)
  hooks/       useMyList (My List) and useLibrary (own titles + named lists) — reducer + localStorage + Supabase sync; useDialog
  lib/         supabase.js (client or null), session.js (shared sign-in + write queue), listSync.js / librarySync.js (rows ⇄ state, diff, remote)
  views/       page-level components (MyList)
  components/  reusable UI (Header, Poster, StarRating, ShowCard, ListToolbar, ShowModal, CommentSection, AddShowModal, ListsSection, ListPicker, ListNameForm)
  styles/      global.css — design tokens + all styles
  test/        setup.js + *.test.js(x)
supabase/
  migrations/  SQL for tables + row-level security (run in Supabase SQL Editor or `supabase db push`)
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
- **Database**: every table has RLS enabled with `auth.uid() = user_id` policies (`shows`: catalog rows have `created_by` null and are public; user rows are owner-only). Schema changes go in a new timestamped file in `supabase/migrations/`; never edit an applied migration. Only the anon/publishable key goes in the browser, never the service-role key.
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

- **Supabase**: the app uses `@supabase/supabase-js`. Claude Code also has the Supabase MCP server (`.mcp.json`, project `xwewyxugdsabrqencnyv`) for migrations, SQL and advisors — keep the files in `supabase/migrations/` in step with what you apply. Users sign in anonymously (must be enabled in the dashboard under Authentication → Sign In / Providers).
- **playwright**, **context7**, **chrome-devtools**: user-scoped (installed for every project per the SPA lecture). Playwright = drive a real browser; Context7 = current library docs; Chrome DevTools = console, network, performance.
- **mobbin** (`.mcp.json`, HTTP `https://api.mobbin.com/mcp`) — UI reference search. Tools: `search_screens`, `search_flows`, `search_sections`. Always use `platform: "web"` and cite results by their `mobbin_url`.

## Current status

- ✅ Supabase sync: anonymous sign-in, `list_entries` + `list_comments` tables with RLS, sync status shown under the title
- ✅ Schema: `profiles` (auto-created per user), `genres` + `shows` catalog (public read-only), list rows linked to both
- ✅ Your own titles: add a movie/series (form dialog), optionally straight to My List; delete it (cascades out of My List and lists)
- ✅ Named lists: create, rename, delete; add/remove titles from the Lists section or from a show's dialog
- ✅ `20261018000000_custom_shows_and_lists.sql` applied to the live project (via Supabase MCP, 2026-10-18)
- ✅ My List: grid, rate 1–5★ (click again to clear), comments (add / edit / delete, spoiler flag, 500-char limit), watch status, filters with counts, sort, stats, add/remove shows, localStorage persistence
- ⏳ Catalog still uses placeholder shows — waiting on the owner's real interests (use `content-curator`)
- ⏳ Next sections to build: Home (hero banner + rows), search, profile
