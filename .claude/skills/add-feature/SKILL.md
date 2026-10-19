---
name: add-feature
description: Step-by-step workflow for adding a feature to Myflix (research → build → test → review → map). Use when the user asks for a new section, control, or behavior in the app.
argument-hint: "[feature description]"
---

# Add a feature to Myflix

Feature requested: $ARGUMENTS

Follow these steps in order. Each step names the subagent that owns it.

1. **Research** (`ui-researcher`) — find Mobbin references and write `docs/research/<feature-slug>.md`. Skip only for tiny tweaks (copy, colors, spacing).
2. **Plan** — list the files to touch using `docs/PROJECT_MAP.md`. New state → new action in `listReducer` (`front-end/src/hooks/useMyList.js`). New pure logic → `front-end/src/utils/`. New UI → `front-end/src/components/` (reusable) or `front-end/src/views/` (page).
3. **Build** (`feature-builder`) — implement following CLAUDE.md conventions. Reuse existing components (`Poster`, `StarRating`, pills, `.btn` classes) before creating new ones.
4. **Test** (`test-writer`) — reducer/unit tests for logic, an integration test in `front-end/src/test/MyList.test.jsx` (or a new `<View>.test.jsx`) for the UI. Query by role/label.
5. **Verify** — `npx vitest run` and `npx vite build` must both pass.
6. **Review** (`code-reviewer`) — fix every Blocker and Should-fix.
7. **Map** (`project-mapper`) — refresh `docs/PROJECT_MAP.md`.

## Checklist before saying "done"

- [ ] Works with keyboard only (Tab, Enter/Space, Escape)
- [ ] Survives a page reload (localStorage)
- [ ] Has an empty state and a disabled state where relevant
- [ ] Looks right at ≤700px width
- [ ] Tests + build green, numbers reported
