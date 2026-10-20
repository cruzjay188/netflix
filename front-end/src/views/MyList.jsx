import { useCallback, useMemo, useState } from 'react'
import { useLibrary } from '../hooks/useLibrary.js'
import { useMyList } from '../hooks/useMyList.js'
import { tmdb as defaultTmdb } from '../lib/tmdb.js'
import { FILTERS, averageRating, combineSyncStatus, filterEntries, sortEntries } from '../utils/listUtils.js'
import { buildCatalog, findTmdbShow, sortedLists, tmdbToShow } from '../utils/libraryUtils.js'
import AddShowModal from '../components/AddShowModal.jsx'
import ListToolbar from '../components/ListToolbar.jsx'
import ListsSection from '../components/ListsSection.jsx'
import ShowCard from '../components/ShowCard.jsx'
import ShowModal from '../components/ShowModal.jsx'
import Poster from '../components/Poster.jsx'
import SyncStatus from '../components/SyncStatus.jsx'
import TmdbSection from '../components/TmdbSection.jsx'

// userId: the logged-in account (null in the device-only mode).
// tmdb: TMDB client (lib/tmdb.js); null without Supabase, which hides the TMDB section.
export default function MyList({ userId = null, tmdb = defaultTmdb }) {
  // useLibrary comes first on purpose: its effects run first, so a newly added title is queued
  // for Supabase before the My List entry that points at it.
  const { library, syncStatus: librarySync, ...libraryActions } = useLibrary({ userId })
  const { list, syncStatus: listSync, ...actions } = useMyList({ userId })
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [openId, setOpenId] = useState(null)
  const [addingShow, setAddingShow] = useState(false)
  const closeModal = useCallback(() => setOpenId(null), [])
  const closeAddShow = useCallback(() => setAddingShow(false), [])

  const catalog = useMemo(() => buildCatalog(library.customShows), [library.customShows])
  const lists = useMemo(() => sortedLists(library.lists), [library.lists])
  const entries = useMemo(
    () =>
      Object.entries(list)
        .filter(([id]) => catalog[id]) // ignore saved ids for shows no longer in the catalog
        .map(([id, entry]) => ({ ...entry, show: catalog[id] })),
    [list, catalog],
  )
  const visible = sortEntries(filterEntries(entries, filter), sort)
  const counts = Object.fromEntries(Object.keys(FILTERS).map((key) => [key, filterEntries(entries, key).length]))
  const avg = averageRating(entries)
  const commentTotal = entries.reduce((sum, e) => sum + e.comments.length, 0)
  const suggestions = Object.values(catalog).filter((s) => !list[s.id])
  const openEntry = openId && entries.find((e) => e.show.id === openId)
  const onListTmdbIds = useMemo(
    () => new Set(entries.filter((e) => e.show.tmdbId).map((e) => e.show.tmdbId)),
    [entries],
  )

  const listActions = {
    toggle: (showId, listId) =>
      showId in library.lists[listId].items
        ? libraryActions.removeFromList(listId, showId)
        : libraryActions.addToList(listId, showId),
    create: (showId, name) => libraryActions.addToList(libraryActions.createList(name), showId),
    deleteShow: (showId) => {
      libraryActions.deleteShow(showId)
      actions.remove(showId)
    },
  }

  function addShow(fields, alsoAddToMyList) {
    const id = libraryActions.addShow(fields)
    if (alsoAddToMyList) actions.add(id)
  }

  // A TMDB show becomes one of the user's own titles (saved once), then goes on My List.
  function addFromTmdb(result) {
    const saved = findTmdbShow(library.customShows, result.id)
    actions.add(saved ? saved.id : libraryActions.addShow(tmdbToShow(result)))
  }

  return (
    <>
      <section aria-labelledby="mylist-heading">
        <div className="list-head">
          <div className="list-head__title">
            <h1 id="mylist-heading">My List</h1>
            <SyncStatus status={combineSyncStatus(listSync, librarySync)} />
          </div>
          <p className="stats" aria-label="List stats">
            <span>
              <strong>{entries.length}</strong> titles
            </span>
            <span>
              <strong>{avg ?? '–'}</strong> avg rating
            </span>
            <span>
              <strong>{commentTotal}</strong> comments
            </span>
          </p>
        </div>

        <ListToolbar filter={filter} onFilter={setFilter} sort={sort} onSort={setSort} counts={counts} />

        {visible.length === 0 ? (
          <p className="empty">
            {entries.length === 0
              ? 'Your list is empty. Add something from the row below.'
              : `Nothing under “${FILTERS[filter]}” yet.`}
          </p>
        ) : (
          <ul className="grid" aria-label="Shows in My List">
            {visible.map((entry) => (
              <ShowCard key={entry.show.id} entry={entry} onOpen={setOpenId} />
            ))}
          </ul>
        )}
      </section>

      {tmdb && <TmdbSection tmdb={tmdb} onListIds={onListTmdbIds} onAdd={addFromTmdb} />}

      <section className="suggestions" aria-labelledby="suggestions-heading">
        <div className="section-head">
          <h2 id="suggestions-heading">Add to My List</h2>
          <button type="button" className="btn btn--outline" onClick={() => setAddingShow(true)}>
            + Add your own title
          </button>
        </div>
        {suggestions.length === 0 ? (
          <p className="muted">Everything in the catalog is already on your list.</p>
        ) : (
          <ul className="row">
            {suggestions.map((show) => (
              <li key={show.id} className="suggestion">
                <Poster show={show} />
                <button
                  type="button"
                  className="add-btn"
                  aria-label={`Add ${show.title} to My List`}
                  onClick={() => actions.add(show.id)}
                >
                  +
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ListsSection lists={lists} catalog={catalog} actions={libraryActions} />

      {openEntry && (
        <ShowModal entry={openEntry} lists={lists} actions={actions} listActions={listActions} onClose={closeModal} />
      )}
      {addingShow && <AddShowModal onAdd={addShow} onClose={closeAddShow} />}
    </>
  )
}
