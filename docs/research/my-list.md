# My List with ratings & comments — UI research
Date: 2026-10-15 · Researcher: ui-researcher (Mobbin MCP)

## References
- [Netflix — My List page](https://mobbin.com/screens/a899e197-90b8-49cf-889e-2eb12cca10ba) — page title top-left, plain grid of 16:9 artwork cards on #141414, nothing else. Borrowed: layout, card shape, header nav with "My List" bolded.
- [Netflix — Browse by Languages](https://mobbin.com/screens/f37241c3-dce4-4d22-ad45-4081551b6dd9) — title on the left, dropdown filters + "Sort by" select on the right. Borrowed: toolbar placement and black/white select styling.
- [Netflix — Home rows with My List row](https://mobbin.com/screens/f556eaad-4619-4ce0-b4df-484483a47ce5) — horizontally scrolling rows. Borrowed: the "Add to My List" row of suggestions with a round + button.
- [Literal — Reviewing a book](https://mobbin.com/screens/cdd5195d-8a5a-44fb-8a63-804ebbd1fbf7) — star row with "4,5 / 5" readout, review textarea, "This contains a spoiler" checkbox. Borrowed: rating readout + spoiler flag.
- [Blue Apron — Rate this dish](https://mobbin.com/screens/7264f8ac-cc09-4d1d-8135-06cb1e7e15c3) — image + stars + feedback textarea with `0/500` counter. Borrowed: character counter and 500 limit.
- [DoorDash — Add a public review](https://mobbin.com/screens/cec9ef2b-6acb-4d2d-baa3-f0513a6202a9) — empty outline stars, disabled Submit until valid. Borrowed: Post disabled until there's text.

## Recommended direction
Keep the page as bare as Netflix's real My List (title + grid), add a slim toolbar (filter chips + sort) and a stats line, and put all rating/commenting inside a Netflix-style detail modal opened from each card. The modal combines Literal's rating + spoiler pattern with Blue Apron's counter.

## Elements implemented
1. Grid of 16:9 cards; under each: status pill, small stars, comment count
2. Filter chips (All / Watching / Finished / Want to watch / Unrated) with counts; sort select
3. Detail modal: hero art, facts row (year · maturity · seasons · genre), synopsis
4. Interactive 1–5 stars with hover preview and "N / 5" readout; click same star to clear
5. Comment form: textarea, `n/500` counter, "Contains spoilers", Post disabled when empty; list with Edit/Delete; spoilers hidden behind a reveal button
6. Watch-status segmented control; "Remove from My List"; "Add to My List" suggestion row

## Accessibility notes
- Stars are 5 separate buttons labelled "1 star"…"5 stars" with `aria-pressed`
- Modal: `role="dialog"`, `aria-modal`, focus moves to Close, Escape closes, focus returns to the card
- Card is a single button labelled "Open <title>"
