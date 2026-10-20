import { SHOWS } from '../data/shows.js'

// Must match the check constraint on shows.maturity_rating. 'NR' = Not Rated (TMDB titles).
export const MATURITY_RATINGS = ['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA', 'G', 'PG', 'PG-13', 'R', 'NC-17', 'NR']

export const KINDS = { movie: 'Movie', series: 'Series' }

export const TITLE_MAX = 100
export const SYNOPSIS_MAX = 500
export const LIST_NAME_MAX = 50

export const EMPTY_SHOW_FORM = {
  title: '',
  kind: 'movie',
  year: String(new Date().getFullYear()),
  seasons: '1',
  genre: 'Comedy',
  maturity: 'PG-13',
  synopsis: '',
}

// The first problem with the "add a title" form, or null when it can be saved.
export function showFormError(form) {
  if (!form.title.trim()) return 'Give it a title.'
  const year = Number(form.year)
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return 'Year must be between 1900 and 2100.'
  if (form.kind === 'series') {
    const seasons = Number(form.seasons)
    if (!Number.isInteger(seasons) || seasons < 1) return 'A series needs at least 1 season.'
  }
  return null
}

export function formToShow(form) {
  return {
    title: form.title.trim(),
    kind: form.kind,
    year: Number(form.year),
    seasons: form.kind === 'series' ? Number(form.seasons) : null,
    genre: form.genre,
    maturity: form.maturity,
    synopsis: form.synopsis.trim(),
  }
}

// A TMDB result (lib/tmdb.js) as fields for addShow. TMDB's lists have no maturity rating or
// season count. The card image is the wide backdrop when there is one, else the tall poster.
export function tmdbToShow(result) {
  return {
    title: result.name,
    kind: 'series',
    year: result.year,
    seasons: null,
    genre: result.genre,
    maturity: 'NR',
    synopsis: result.overview ?? '',
    tmdbId: result.id,
    posterUrl: result.backdrop_url ?? result.poster_url ?? null,
  }
}

// The user's saved copy of a TMDB show, or null when they haven't added it yet.
export function findTmdbShow(customShows, tmdbId) {
  return Object.values(customShows).find((show) => show.tmdbId === tmdbId) ?? null
}

// Custom titles have no artwork, so pick a gradient from the id (same id → same colors).
const POSTER_PALETTES = [
  ['#1a1a2e', '#e94560'],
  ['#0f3443', '#34e89e'],
  ['#2b1055', '#7597de'],
  ['#3a1c71', '#ffaf7b'],
  ['#232526', '#c9a227'],
  ['#200122', '#b31217'],
]

export function posterColors(id) {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return POSTER_PALETTES[hash % POSTER_PALETTES.length]
}

// Every title the app knows, by id: the user's own (newest first), then the built-in catalog.
export function buildCatalog(customShows) {
  const custom = Object.values(customShows)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((show) => ({ ...show, colors: posterColors(show.id), custom: true }))
  return Object.fromEntries([...custom, ...SHOWS].map((show) => [show.id, show]))
}

// Lists as an array, oldest first, so new lists appear at the bottom.
export function sortedLists(lists) {
  return Object.entries(lists)
    .map(([id, list]) => ({ id, ...list }))
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function isListNameTaken(lists, name, exceptId = null) {
  const wanted = name.trim().toLowerCase()
  return Object.entries(lists).some(([id, list]) => id !== exceptId && list.name.toLowerCase() === wanted)
}
