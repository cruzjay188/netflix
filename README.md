# Myflix

My own version of Netflix, personalized around the shows and activities I'm into.

The first section is **My List**: save shows, rate them 1–5 stars, leave comments (with spoiler protection), track whether you're watching or finished, and filter/sort your list. Your list syncs to **Supabase** (and is also saved in the browser, so it works offline).

## Run it

```bash
npm install
npm run dev     # open http://localhost:5173
npm test        # run the test suite
npm run build   # production build
```

### Connect Supabase (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run each file in `supabase/migrations/` in order (oldest first), or use the Supabase CLI: `supabase db push`.
3. In **Authentication → Sign In / Providers**, turn on **Anonymous sign-ins**.
4. Copy `.env.example` to `.env.local` and paste your Project URL and anon (publishable) key.
5. Restart `npm run dev`. The page should say **Synced to cloud** under the title.

## How it's organized

```
src/
  data/         show catalog (shows.js)
  utils/        pure helpers (filter, sort, average, timeAgo)
  hooks/        useMyList: list state, localStorage, Supabase sync
  lib/          Supabase client + row ⇄ state sync
  views/        pages (MyList)
  components/   reusable UI (cards, modal, stars, comments, …)
  styles/       global.css
  test/         Vitest + React Testing Library tests
supabase/
  migrations/   database tables, policies and seed data (run in order)
docs/
  SCHEMA.md     database diagram (ERD) and table reference
  PROJECT_MAP.md  file-by-file map
  DESIGN.md     colors, components and UI patterns
  research/     Mobbin references each feature was designed from
postman/        Postman collection for the Supabase API (import it, plus a local environment)
.claude/        Claude Code subagents and skills
CLAUDE.md       instructions for Claude Code
.mcp.json       MCP servers: Mobbin (UI research), Supabase (database)
```

See [docs/SCHEMA.md](docs/SCHEMA.md) for the database diagram and [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) for how the files fit together.

## Built with

React 19, Vite, Supabase, Vitest, React Testing Library. UI references from [Mobbin](https://mobbin.com).
