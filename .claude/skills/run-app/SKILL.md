---
name: run-app
description: Start, test, and build the Myflix app. Use when asked to run the app, check that it works, run tests, or produce a production build.
allowed-tools: Bash(npm run dev) Bash(npm run build) Bash(npm run test) Bash(npx vitest *) Bash(npx vite build) Bash(npx vite preview)
---

# Run Myflix

Run every command inside `front-end/` (where `package.json` lives): `cd front-end` first.

| Goal | Command | Expect |
|---|---|---|
| Install deps (first time) | `npm install` | `node_modules/` created |
| Dev server | `npm run dev` | Vite prints `http://localhost:5173` |
| Tests once | `npm test` (= `vitest run`) | `Tests N passed` |
| Tests in watch mode | `npm run test:watch` | re-runs on save |
| Production build | `npm run build` | `dist/` with index.html + assets |
| Preview the build | `npm run preview` | serves `dist/` on :4173 |

## Notes

- Cloud sync needs `front-end/.env.local` (copy `front-end/.env.example`). Without it the page shows "Saved on this device" and everything still works. Restart the dev server after editing env vars.

- Run the dev server in the background (`run_in_background`) so the session isn't blocked; stop it when done.
- The app stores the user's list under the localStorage key `myflix:my-list`. To reset to the starter list, clear it in DevTools → Application → Local Storage, or run `localStorage.removeItem('myflix:my-list')` in the console.
- `dist/` is gitignored — don't commit it.
- If tests fail, report the failing test name and assertion; don't paper over it.
