# Myflix

My own version of Netflix, personalized around the shows and activities I'm into.

The first section is **My List**: save shows, rate them 1–5 stars, leave comments (with spoiler protection), track whether you're watching or finished, and filter/sort your list.

You can also **add your own movies and series** that aren't in the catalog, and make **your own lists** ("Comfort shows", "Watch with Dad"…) to group titles however you like.

Everything syncs to **Supabase** (and is also saved in the browser, so it works offline).

## Run it

```bash
cd front-end
npm install
npm run dev     # open http://localhost:5173
npm test        # run the test suite
npm run build   # production build
```

### Connect Supabase (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run each file in `supabase/migrations/` in order (oldest first), or use the Supabase CLI: `supabase db push`.
3. In **Authentication → Sign In / Providers**, turn on **Anonymous sign-ins**.
4. Copy `front-end/.env.example` to `front-end/.env.local` and paste your Project URL and anon (publishable) key.
5. Restart `npm run dev`. The page should say **Synced to cloud** under the title.

## How it's organized

```
front-end/      the React app (run npm commands here)
  app_outline/  user_journey.md: what a user can do, page by page
  src/
    data/         show catalog (shows.js)
    utils/        pure helpers (filter, sort, average, timeAgo, show form, list names)
    hooks/        useMyList (My List) + useLibrary (your titles and lists): state, localStorage, Supabase sync
    lib/          Supabase client, shared sign-in + write queue, row ⇄ state sync
    views/        pages (MyList)
    components/   reusable UI (cards, modal, stars, comments, …)
    styles/       global.css
    test/         Vitest + React Testing Library tests
  index.html, package.json, vite.config.js, .env.example
supabase/       the database
  migrations/   database tables, policies and seed data (run in order)
  backups/      a copy of the test rows from before authentication
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
