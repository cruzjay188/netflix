import { useEffect, useState } from 'react'
import Poster from './Poster.jsx'
import { TITLE_MAX, posterColors, tmdbToShow } from '../utils/libraryUtils.js'

// Real shows from TMDB: this week's trending, or search results.
// tmdb: { trending(), search(query) } from lib/tmdb.js (a fake in tests).
// onListIds: Set of TMDB ids already on My List. onAdd(result): save the show + add it to My List.
export default function TmdbSection({ tmdb, onListIds, onAdd }) {
  const [text, setText] = useState('')
  // A new object on every search (or retry) so the effect runs again; query '' = trending.
  const [request, setRequest] = useState({ query: '' })
  const [result, setResult] = useState({ status: 'loading', shows: [] })

  useEffect(() => {
    let cancelled = false // ignore an older request that finishes after a newer one
    const load = request.query ? tmdb.search(request.query) : tmdb.trending()
    load
      .then((shows) => !cancelled && setResult({ status: 'ready', shows }))
      .catch((err) => {
        if (cancelled) return
        console.error('TMDB request failed', err)
        setResult({ status: 'error', shows: [] })
      })
    return () => {
      cancelled = true
    }
  }, [tmdb, request])

  function load(query) {
    setResult({ status: 'loading', shows: [] })
    setRequest({ query })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (text.trim()) load(text.trim())
  }

  function showTrending() {
    setText('')
    load('')
  }

  return (
    <section className="suggestions" aria-labelledby="tmdb-heading">
      <div className="section-head">
        <h2 id="tmdb-heading">{request.query ? `Results for “${request.query}”` : 'Trending on TMDB'}</h2>
        <form className="tmdb-search" role="search" onSubmit={handleSubmit}>
          <input
            type="search"
            aria-label="Search TMDB"
            placeholder="Search TV shows"
            value={text}
            maxLength={TITLE_MAX}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn btn--primary" disabled={!text.trim()}>
            Search
          </button>
          {request.query && (
            <button type="button" className="btn btn--ghost" onClick={showTrending}>
              Back to trending
            </button>
          )}
        </form>
      </div>

      {result.status === 'loading' && (
        <p className="muted" role="status">
          Loading shows from TMDB…
        </p>
      )}
      {result.status === 'error' && (
        <div className="tmdb-error" role="alert">
          <p className="form-error">Couldn’t load shows from TMDB.</p>
          <button type="button" className="btn btn--ghost" onClick={() => load(request.query)}>
            Try again
          </button>
        </div>
      )}
      {result.status === 'ready' && result.shows.length === 0 && (
        <p className="muted">No shows found for “{request.query}”.</p>
      )}
      {result.status === 'ready' && result.shows.length > 0 && (
        <ul className="row" aria-label="TMDB shows">
          {result.shows.map((tmdbShow) => {
            const show = { ...tmdbToShow(tmdbShow), colors: posterColors(`tmdb-${tmdbShow.id}`) }
            const name = `${tmdbShow.name} (${tmdbShow.year})` // years tell same-named shows apart
            const onList = onListIds.has(tmdbShow.id)
            return (
              <li key={tmdbShow.id} className="suggestion">
                <Poster show={show} />
                <button
                  type="button"
                  className="add-btn"
                  aria-label={onList ? `${name} is on My List` : `Add ${name} to My List`}
                  disabled={onList}
                  onClick={() => onAdd(tmdbShow)}
                >
                  {onList ? '✓' : '+'}
                </button>
                <p className="suggestion__meta">
                  {tmdbShow.year} · {tmdbShow.genre}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
