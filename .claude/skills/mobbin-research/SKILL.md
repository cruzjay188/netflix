---
name: mobbin-research
description: How to search Mobbin for Netflix-style UI references and write a research brief to docs/research/. Use before designing any new Myflix screen or component.
argument-hint: "[screen or component to research]"
allowed-tools: mcp__mobbin__search_screens mcp__mobbin__search_flows mcp__mobbin__search_sections Read Write
---

# Mobbin research for Myflix

Topic: $ARGUMENTS

## Searching

- Tool choice: one screen → `mcp__mobbin__search_screens`; a multi-step journey (onboarding, profile setup) → `mcp__mobbin__search_flows`; a marketing-page block → `mcp__mobbin__search_sections`.
- Always pass `platform: "web"`, `output_destination: "code"`, `output_tool: "React"`, `limit: 6`, and the same `task_intent` for every call in one research task.
- Query style: describe ONE screen concretely ("Netflix My List page with grid of saved shows"), name the app to filter to it, no style adjectives, no negations.
- Search order: Netflix first → one best-in-class pattern from another app → (optional) an edge state such as empty state or error.
- Look at the images. Do not describe a screen you haven't seen.

## Brief template — save to `docs/research/<feature-slug>.md`

```markdown
# <Feature> — UI research
Date: YYYY-MM-DD · Researcher: ui-researcher

## References
- [App — what the screen shows](mobbin_url) — what to borrow

## Recommended direction
One paragraph.

## Elements to implement
1. Layout …
2. Controls …
3. States (empty / loading / error / disabled) …
4. Microcopy …

## Accessibility notes
- …

## Fits our design system?
Tokens/components from docs/DESIGN.md to reuse; anything new we'd need.
```

If a Mobbin response includes an `ai_usage_notice`, copy its text word-for-word at the bottom of the brief.
