# Myflix design system

The look follows Netflix's web app (dark, red accent, 16:9 artwork cards). All tokens live in `:root` in `src/styles/global.css`.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#141414` | Page background |
| `--surface` | `#181818` | Modal / raised panels |
| `--surface-2` | `#232323` | Inputs, comment bubbles, neutral pills |
| `--border` | `#333` | Dividers, outlines |
| `--text` | `#e5e5e5` | Body text |
| `--muted` | `#a3a3a3` | Secondary text, timestamps |
| `--red` / `--red-dark` | `#e50914` / `#b20710` | Brand, primary buttons, "Watching" pill |
| `--gold` | `#f5c518` | Star ratings, spoiler accents |
| `--radius` | `6px` | Modal corners |

Font: Helvetica Neue → Helvetica → Arial. Header 26px/900 logo; page title 32px; section title 20px; body 14–16px.

## Components

| Component | File | Notes |
|---|---|---|
| Header | `components/Header.jsx` | Sticky, gradient; nav hidden ≤700px |
| Poster | `components/Poster.jsx` | Generated art: 135° gradient of `show.colors` + title. Sizes `card` (16:9) and `hero` (16:7) |
| StarRating | `components/StarRating.jsx` | Interactive (5 buttons, hover preview, `aria-pressed`) or `readOnly` compact display |
| ShowCard | `components/ShowCard.jsx` | Poster + status pill + small stars + comment count; scales 1.04 on hover/focus |
| ListToolbar | `components/ListToolbar.jsx` | Filter chips with counts + sort `<select>` |
| ShowModal | `components/ShowModal.jsx` | Netflix-style detail dialog: hero, facts, synopsis, rating, status, comments, remove |
| CommentSection | `components/CommentSection.jsx` | Form (textarea, counter, spoiler checkbox) + list with edit/delete/reveal |

## Reusable classes

- Buttons: `.btn` + `.btn--primary` (red), `.btn--ghost`, `.btn--danger` (outline); `.link-btn` for text actions
- Pills: `.pill` + `--watching` (red), `--finished` (green), `--spoiler` (gold on brown)
- Chips: `.chip` with `aria-pressed="true"` → white fill
- Segmented control: `.segmented` with `aria-pressed` buttons

## Patterns

- **Toggles** are buttons with `aria-pressed`; selected = white background, black text.
- **Empty states**: centered muted sentence telling the user what to do next.
- **Spoilers**: striped gold cover button; the text renders only after a click.
- **Responsive**: one breakpoint at 700px (smaller grid columns, tighter modal padding, nav hidden).

## References

See `docs/research/` for the Mobbin screens each feature was based on.
