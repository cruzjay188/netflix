# Project map

**Last updated:** 2026-10-18 · **Tests:** 49 passing (8 files) · **Build:** ✅
_Maintained by the `project-mapper` agent. Regenerate after any structural change._

## Directory tree

```
netflix/
├── CLAUDE.md                     project instructions for Claude Code
├── README.md                     human-facing overview
├── index.html                    Vite HTML entry (#root)
├── vite.config.js                React plugin + Vitest config (jsdom, setup file)
├── package.json                  scripts: dev, build, preview, test, test:watch
├── .mcp.json                     project MCP servers (mobbin, supabase)
├── .env.example                  Supabase env template (copy to .env.local)
├── .gitignore                    node_modules, dist, coverage, .env*, local settings, postman/
├── postman/
│   └── myflix.postman_collection.json  Supabase API requests (environments/ is gitignored)
├── supabase/migrations/
│   ├── 20261016000000_my_list.sql  list_entries + list_comments tables, RLS policies
│   ├── 20261016190000_profiles_catalog.sql  profiles (auto on sign-up), genres + shows catalog, FKs
│   └── 20261018000000_custom_shows_and_lists.sql  user-added shows (created_by), lists, list_items
├── .claude/
│   ├── settings.json             allowed commands + enabled MCP servers
│   ├── agents/                   9 subagents (6 custom + 3 course agents, see Tooling)
│   └── skills/                   add-feature, mobbin-research, run-app + 5 course skills
├── docs/
│   ├── PROJECT_MAP.md            this file
│   ├── SCHEMA.md                 database ERD + table reference
│   ├── DESIGN.md                 tokens, components, UI patterns
│   └── research/my-list.md       Mobbin references for My List
└── src/
    ├── main.jsx                  createRoot + StrictMode + global.css
    ├── App.jsx                   <Header/> + <main><MyList/></main>
    ├── data/shows.js             SHOWS catalog, SHOWS_BY_ID, STARTER_LIST, GENRES
    ├── utils/
    │   ├── listUtils.js          STATUSES, FILTERS, SORTS, COMMENT_MAX, filter/sort/average/timeAgo, combineSyncStatus
    │   └── libraryUtils.js       show form (EMPTY_SHOW_FORM, showFormError, formToShow), buildCatalog, posterColors, sortedLists, isListNameTaken
    ├── hooks/
    │   ├── useMyList.js          listReducer, createInitialState, useMyList (localStorage + Supabase sync, syncStatus)
    │   ├── useLibrary.js         libraryReducer, useLibrary (your titles + named lists; same sync model)
    │   └── useDialog.js          focus, Escape, scroll lock for dialogs
    ├── lib/
    │   ├── supabase.js           createClient from VITE_ env vars, or null (unset / tests)
    │   ├── session.js            getUserId (one anonymous sign-in per client), enqueue (shared write queue)
    │   ├── listSync.js           entryToRow, commentToRow, rowsToState, diffStates, createRemote, check
    │   └── librarySync.js        showToRow, listToRow, itemToRow, rowsToLibrary, diffLibrary, createLibraryRemote
    ├── views/MyList.jsx          My List page: stats, toolbar, grid, suggestions + add-title button, Your lists, dialogs
    ├── components/
    │   ├── Header.jsx            logo + nav (My List current) + avatar
    │   ├── SyncStatus.jsx        "Synced to cloud" / "Saved on this device" indicator
    │   ├── Poster.jsx            gradient artwork (card | hero)
    │   ├── StarRating.jsx        interactive or readOnly 1–5 stars
    │   ├── ShowCard.jsx          grid card button → opens modal
    │   ├── ListToolbar.jsx       filter chips with counts + sort select
    │   ├── ShowModal.jsx         detail dialog: rating, status, comments, remove
    │   ├── CommentSection.jsx    comment form + list (edit/delete/spoiler reveal)
    │   ├── AddShowModal.jsx      "Add a movie or show" form dialog
    │   ├── ListsSection.jsx      Your lists: create, rename, delete, add/remove titles
    │   ├── ListPicker.jsx        list toggles + "new list with this title" inside ShowModal
    │   └── ListNameForm.jsx      list name input (blocks empty/duplicate names)
    ├── styles/global.css         design tokens + all styles
    └── test/
        ├── setup.js              jest-dom matchers, cleanup, localStorage.clear
        ├── listUtils.test.js     4 tests
        ├── useMyList.test.js     5 tests
        ├── listSync.test.js      8 tests (fake Supabase client)
        ├── MyList.test.jsx       7 tests
        ├── libraryUtils.test.js  5 tests
        ├── useLibrary.test.js    5 tests
        ├── librarySync.test.js   7 tests (fake Supabase client)
        └── Library.test.jsx      8 tests (add titles, lists)
```

## Module table

| File | Purpose | Key exports | Depends on |
|---|---|---|---|
| `src/data/shows.js` | Show catalog (placeholder titles) | `SHOWS`, `SHOWS_BY_ID`, `STARTER_LIST` | — |
| `src/utils/listUtils.js` | Pure list helpers + labels | `STATUSES`, `FILTERS`, `SORTS`, `COMMENT_MAX`, `filterEntries`, `sortEntries`, `averageRating`, `timeAgo` | — |
| `src/hooks/useMyList.js` | List state + persistence + sync | `STORAGE_KEY`, `createInitialState`, `listReducer`, `useMyList` | `data/shows`, `lib/supabase`, `lib/listSync` |
| `src/lib/supabase.js` | Supabase client | `supabase` (client or null) | `@supabase/supabase-js` |
| `src/lib/listSync.js` | State ⇄ DB rows, diffing, remote ops | `entryToRow`, `commentToRow`, `rowsToState`, `diffStates`, `isEmptyDiff`, `createRemote` | — |
| `src/components/SyncStatus.jsx` | Sync indicator | default | — |
| `src/views/MyList.jsx` | Page composition | default `MyList` | hook, utils, data, ListToolbar, ShowCard, ShowModal, Poster, SyncStatus |
| `src/components/ShowModal.jsx` | Detail dialog | default | Poster, StarRating, CommentSection, utils |
| `src/components/CommentSection.jsx` | Comments UI | default | utils (`COMMENT_MAX`, `timeAgo`) |
| `src/components/ShowCard.jsx` | Grid card | default | Poster, StarRating, utils |
| `src/components/ListToolbar.jsx` | Filters + sort | default | utils |
| `src/components/StarRating.jsx` | Stars | default | — |
| `src/components/Poster.jsx` | Artwork | default | — |
| `src/components/Header.jsx` | Top nav | default | — |

## Data flow

```
data/shows.js ──► hooks/useMyList.js ──► views/MyList.jsx ──► components/*
 (catalog)          listReducer            joins list + catalog     ShowCard / ShowModal
                    ⇅ localStorage         filter → sort (utils)    call actions.rate(),
                    "myflix:my-list"                                addComment(), …
                    ⇅ lib/listSync.js
                      diffStates(prev, next) → upsert/delete changed rows
                    ⇅ Supabase (anonymous user, RLS)
                      list_entries (user_id, show_id, status, rating, added_at)
                      list_comments (id, user_id, show_id, body, spoiler, created_at, edited_at)
```

Sync rules: on load, cloud data replaces the local list; if the cloud is empty the local list is uploaded. After that every state change is diffed and sent in order (entries → comments → deletes) through a serial queue. A failed batch resets to the last confirmed state and retries on the next change.

State shape (keyed by show id):

```js
{
  "wednesday": {
    addedAt: 1760000000000,
    status: "want" | "watching" | "finished",
    rating: 0,            // 0 = unrated, 1–5
    comments: [{ id, text, spoiler, createdAt, editedAt? }]   // newest first
  }
}
```

Reducer actions: `load` (replace with cloud state), `add`, `remove`, `rate` (same value clears), `setStatus`, `addComment`, `editComment`, `deleteComment`.

## Features → files → tests

| Feature | Files | Tests |
|---|---|---|
| Rate 1–5★ / clear | StarRating, ShowModal, `rate` action | reducer "rates a show…", integration "rates a show and reflects it…" |
| Comments add/edit/delete | CommentSection, `*Comment` actions | reducer "adds, edits and deletes…", integration "posts, edits and deletes…" |
| Spoiler hiding | CommentSection | integration "hides spoiler comments…" |
| Watch status + filters | ShowModal, ListToolbar, `filterEntries` | utils "filters by status…", integration "filters by status…" |
| Sort | ListToolbar, `sortEntries` | utils "sorts by recency, rating…" |
| Stats (titles, avg, comments) | MyList, `averageRating` | utils "averages only rated shows", integration rating test |
| Add / remove shows | MyList suggestions row, ShowModal | reducer "adds and removes…", integration "adds and removes shows" |
| Persistence (browser) | useMyList effect | integration "persists ratings and comments…" |
| Cloud sync (Supabase) | lib/supabase, lib/session, lib/listSync, lib/librarySync, useMyList, useLibrary, SyncStatus, migrations | listSync.test.js, librarySync.test.js |
| Add your own title | AddShowModal, libraryUtils (form), `addShow` action, buildCatalog | Library "adds a movie…", "can add a title without…", "needs a title…" |
| Delete your own title | ShowModal, `deleteShow` + `remove` | Library "deleting your title…", reducer test |
| Named lists | ListsSection, ListNameForm, ListPicker, list actions | Library "Your lists" tests, useLibrary reducer tests |

## Tooling

| Item | Purpose |
|---|---|
| `project-mapper` agent | Keeps this file current |
| `ui-researcher` agent | Mobbin research → `docs/research/` |
| `feature-builder` agent | Implements features |
| `test-writer` agent | Vitest/RTL tests |
| `code-reviewer` agent | Read-only review |
| `content-curator` agent | Personalizes `src/data/shows.js` |
| `front-end-agent` / `supabase-agent` / `qa-agent` | Course agents from the instructor repos (UI, Supabase, browser QA) |
| Design skills | `frontend-design`, `ui-ux-pro-max`, `design-taste-frontend`, `design-motion-principles` |
| `postgresql-table-design` skill | Schema design rules for Supabase/Postgres |
| `playwright`, `context7`, `chrome-devtools` MCPs | User-scoped: browser automation, live docs, DevTools |
| `/add-feature`, `/mobbin-research`, `/run-app` skills | Workflows and commands |
| `mobbin` MCP | UI reference search |
| Supabase | Cloud storage via supabase-js; Supabase MCP (project-scoped, `.mcp.json`) for Claude |

## Gaps / TODOs

- Catalog is placeholder content; personalize via `content-curator`.
- Header nav links are inert (only My List exists).
- Focus is not trapped inside the modal (Tab can reach the page behind it).
- `timeAgo` output doesn't refresh while a modal stays open.
- `public/` is empty (no favicon).
- Anonymous users lose their cloud list if they clear site data; add email login to keep it across devices.
- Changes made before the first cloud load finishes are replaced by the cloud copy when one exists.
- If the cloud is empty and this browser already has your own titles on My List, the first upload can race the title upload and show "Cloud sync failed" once; the next change resends it.
- Users can only pick genres that already exist in the `genres` table.
