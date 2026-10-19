// Swap these for the shows you actually watch — the rest of the app reads from here.
// `colors` drive the generated poster art (no image files needed).
export const SHOWS = [
  {
    id: 'stranger-things',
    title: 'Stranger Things',
    year: 2016,
    genre: 'Sci-Fi',
    seasons: 5,
    maturity: 'TV-14',
    synopsis:
      'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    colors: ['#3b0a0a', '#c11119'],
  },
  {
    id: 'wednesday',
    title: 'Wednesday',
    year: 2022,
    genre: 'Mystery',
    seasons: 2,
    maturity: 'TV-14',
    synopsis:
      'Smart, sarcastic and a little dead inside, Wednesday Addams investigates twisted mysteries while making new friends — and foes — at Nevermore Academy.',
    colors: ['#0d0d12', '#4b3f72'],
  },
  {
    id: 'avatar',
    title: 'Avatar: The Last Airbender',
    year: 2024,
    genre: 'Fantasy',
    seasons: 1,
    maturity: 'TV-14',
    synopsis:
      'A young boy known as the Avatar must master the four elemental powers to save a world at war and fight a ruthless enemy bent on stopping him.',
    colors: ['#0b3b5c', '#f2a541'],
  },
  {
    id: 'one-piece',
    title: 'One Piece',
    year: 2023,
    genre: 'Adventure',
    seasons: 2,
    maturity: 'TV-14',
    synopsis:
      'With his straw hat and ragtag crew, young pirate Monkey D. Luffy goes on an epic voyage for treasure.',
    colors: ['#08304a', '#e8462f'],
  },
  {
    id: 'the-last-dance',
    title: 'The Last Dance',
    year: 2020,
    genre: 'Sports Docuseries',
    seasons: 1,
    maturity: 'TV-MA',
    synopsis:
      'Rare footage and candid interviews tell the story of Michael Jordan and the 1990s Chicago Bulls dynasty.',
    colors: ['#1a0505', '#b5121b'],
  },
  {
    id: 'squid-game',
    title: 'Squid Game',
    year: 2021,
    genre: 'Thriller',
    seasons: 3,
    maturity: 'TV-MA',
    synopsis:
      'Hundreds of cash-strapped players accept a strange invitation to compete in children’s games. Inside, a tempting prize awaits — with deadly high stakes.',
    colors: ['#062b2b', '#e6007e'],
  },
  {
    id: 'brooklyn-nine-nine',
    title: 'Brooklyn Nine-Nine',
    year: 2013,
    genre: 'Comedy',
    seasons: 8,
    maturity: 'TV-14',
    synopsis:
      'Brilliant but immature Brooklyn detective Jake Peralta must learn to follow the rules and be a team player when his squad gets an exacting new captain.',
    colors: ['#0f2a4a', '#f5c518'],
  },
  {
    id: 'chefs-table',
    title: 'Chef’s Table',
    year: 2015,
    genre: 'Food Docuseries',
    seasons: 7,
    maturity: 'TV-PG',
    synopsis:
      'In this Emmy-nominated series, each episode takes you inside the lives and kitchens of the world’s most renowned chefs.',
    colors: ['#2b1a0e', '#c47a35'],
  },
  {
    id: 'arcane',
    title: 'Arcane',
    year: 2021,
    genre: 'Animation',
    seasons: 2,
    maturity: 'TV-14',
    synopsis:
      'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and clashing convictions.',
    colors: ['#1b0f33', '#2fc4c9'],
  },
  {
    id: 'formula-1',
    title: 'Formula 1: Drive to Survive',
    year: 2019,
    genre: 'Sports Docuseries',
    seasons: 7,
    maturity: 'TV-MA',
    synopsis:
      'Drivers, managers and team owners live life in the fast lane — both on and off the track — during each cutthroat season of Formula 1 racing.',
    colors: ['#111111', '#e10600'],
  },
]

export const SHOWS_BY_ID = Object.fromEntries(SHOWS.map((s) => [s.id, s]))

// What "My List" starts with on a fresh browser.
export const STARTER_LIST = ['stranger-things', 'wednesday', 'avatar', 'the-last-dance', 'brooklyn-nine-nine']

// Genres a user can pick for their own titles. Must match the rows in the Supabase `genres` table.
export const GENRES = [...new Set(SHOWS.map((s) => s.genre))].sort()
