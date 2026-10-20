import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyList from '../views/MyList.jsx'
import { LIBRARY_KEY } from '../hooks/useLibrary.js'
import { rowsToLibrary, showToRow } from '../lib/librarySync.js'
import { findTmdbShow, tmdbToShow } from '../utils/libraryUtils.js'

// Shaped like the `tmdb` Edge Function's results.
const OFFICE = {
  id: 2316,
  name: 'The Office',
  overview: 'The everyday lives of office employees in Scranton.',
  first_air_date: '2005-03-24',
  year: 2005,
  genre: 'Comedy',
  poster_url: 'https://image.tmdb.org/t/p/w500/office.jpg',
  backdrop_url: 'https://image.tmdb.org/t/p/w780/office-wide.jpg',
}
const SHOGUN = { ...OFFICE, id: 126308, name: 'Shōgun', year: 2024, genre: 'Drama', backdrop_url: null }

// Stand-in for lib/tmdb.js, so tests never call the real API.
function fakeTmdb({ trending = [OFFICE, SHOGUN], search = [SHOGUN] } = {}) {
  return { trending: vi.fn(() => Promise.resolve(trending)), search: vi.fn(() => Promise.resolve(search)) }
}

describe('tmdbToShow', () => {
  it('turns a TMDB result into a series with no rating, preferring the wide image', () => {
    expect(tmdbToShow(OFFICE)).toEqual({
      title: 'The Office',
      kind: 'series',
      year: 2005,
      seasons: null,
      genre: 'Comedy',
      maturity: 'NR',
      synopsis: OFFICE.overview,
      tmdbId: 2316,
      posterUrl: OFFICE.backdrop_url,
    })
    expect(tmdbToShow(SHOGUN).posterUrl).toBe(SHOGUN.poster_url)
  })

  it('finds a saved TMDB show by its TMDB id', () => {
    const saved = { id: 'u-1', tmdbId: 2316 }
    expect(findTmdbShow({ 'u-1': saved, 'u-2': { id: 'u-2' } }, 2316)).toBe(saved)
    expect(findTmdbShow({ 'u-2': { id: 'u-2' } }, 2316)).toBeNull()
  })
})

describe('TMDB titles in sync rows', () => {
  const genreIds = { Comedy: 7 }
  const show = { ...tmdbToShow(OFFICE), id: 'u-1', createdAt: 0 }

  it('sends tmdb_id and poster_url only for TMDB titles', () => {
    expect(showToRow(show, genreIds)).toMatchObject({ tmdb_id: 2316, poster_url: OFFICE.backdrop_url, maturity_rating: 'NR' })
    const handMade = { ...show, tmdbId: undefined, posterUrl: undefined }
    expect(showToRow(handMade, genreIds)).not.toHaveProperty('tmdb_id')
  })

  it('reads them back from the database', () => {
    const row = { ...showToRow(show, genreIds), genres: { name: 'Comedy' } }
    expect(rowsToLibrary([row], [], []).customShows['u-1']).toMatchObject({ tmdbId: 2316, posterUrl: OFFICE.backdrop_url })
  })
})

describe('TMDB section', () => {
  it('shows trending shows with their real images', async () => {
    render(<MyList tmdb={fakeTmdb()} />)
    const section = screen.getByRole('region', { name: 'Trending on TMDB' })
    expect(within(section).getByRole('status')).toHaveTextContent('Loading shows from TMDB')

    expect(await within(section).findByRole('button', { name: 'Add The Office (2005) to My List' })).toBeInTheDocument()
    expect(within(section).getByText('2024 · Drama')).toBeInTheDocument()
    const images = within(section).getAllByRole('presentation')
    expect(images.map((img) => img.getAttribute('src'))).toEqual([OFFICE.backdrop_url, SHOGUN.poster_url])
  })

  it('adds a TMDB show to My List as a series from TMDB', async () => {
    const user = userEvent.setup()
    render(<MyList tmdb={fakeTmdb()} />)
    await user.click(await screen.findByRole('button', { name: 'Add The Office (2005) to My List' }))

    expect(screen.getByRole('button', { name: 'The Office (2005) is on My List' })).toBeDisabled()
    const grid = screen.getByRole('list', { name: 'Shows in My List' })
    await user.click(within(grid).getByRole('button', { name: 'Open The Office' }))
    const dialog = screen.getByRole('dialog', { name: 'The Office' })
    for (const fact of ['2005', 'NR', 'Series', 'Comedy', 'From TMDB']) {
      expect(within(dialog).getByText(fact)).toBeInTheDocument()
    }
  })

  it('saves a TMDB show only once, even after removing and re-adding it', async () => {
    const user = userEvent.setup()
    render(<MyList tmdb={fakeTmdb()} />)
    await user.click(await screen.findByRole('button', { name: 'Add The Office (2005) to My List' }))
    await user.click(screen.getByRole('button', { name: 'Open The Office' }))
    await user.click(screen.getByRole('button', { name: 'Remove from My List' }))
    await user.click(screen.getByRole('button', { name: 'Add The Office (2005) to My List' }))

    expect(screen.getByRole('button', { name: 'Open The Office' })).toBeInTheDocument()
    const saved = Object.values(JSON.parse(localStorage.getItem(LIBRARY_KEY)).customShows)
    expect(saved.filter((show) => show.tmdbId === OFFICE.id)).toHaveLength(1)
  })

  it('searches TMDB and goes back to trending', async () => {
    const user = userEvent.setup()
    const tmdb = fakeTmdb()
    render(<MyList tmdb={tmdb} />)
    await screen.findByRole('button', { name: 'Add The Office (2005) to My List' })

    await user.type(screen.getByRole('searchbox', { name: 'Search TMDB' }), 'shogun')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(tmdb.search).toHaveBeenCalledWith('shogun')
    const results = screen.getByRole('region', { name: 'Results for “shogun”' })
    expect(await within(results).findByRole('button', { name: 'Add Shōgun (2024) to My List' })).toBeInTheDocument()
    expect(within(results).queryByRole('button', { name: /The Office/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to trending' }))
    expect(await screen.findByRole('button', { name: 'Add The Office (2005) to My List' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search TMDB' })).toHaveValue('')
  })

  it('says so when a search finds nothing', async () => {
    const user = userEvent.setup()
    render(<MyList tmdb={fakeTmdb({ search: [] })} />)
    await user.type(screen.getByRole('searchbox', { name: 'Search TMDB' }), 'zzzz')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByText('No shows found for “zzzz”.')).toBeInTheDocument()
  })

  it('shows an error with a retry when TMDB fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const tmdb = fakeTmdb()
    tmdb.trending.mockRejectedValueOnce(new Error('TMDB is down'))
    render(<MyList tmdb={tmdb} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load shows from TMDB.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: 'Add The Office (2005) to My List' })).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('is hidden without Supabase (device-only mode)', () => {
    render(<MyList tmdb={null} />)
    expect(screen.queryByRole('region', { name: 'Trending on TMDB' })).not.toBeInTheDocument()
  })
})
