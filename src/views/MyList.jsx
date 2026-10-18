import { useCallback, useMemo, useState } from 'react'
import { SHOWS, SHOWS_BY_ID } from '../data/shows.js'
import { useMyList } from '../hooks/useMyList.js'
import { FILTERS, averageRating, filterEntries, sortEntries } from '../utils/listUtils.js'
import ListToolbar from '../components/ListToolbar.jsx'
import ShowCard from '../components/ShowCard.jsx'
import ShowModal from '../components/ShowModal.jsx'
import Poster from '../components/Poster.jsx'
import SyncStatus from '../components/SyncStatus.jsx'

export default function MyList() {
  const { list, syncStatus, ...actions } = useMyList()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [openId, setOpenId] = useState(null)
  const closeModal = useCallback(() => setOpenId(null), [])

  const entries = useMemo(
    () =>
      Object.entries(list)
        .filter(([id]) => SHOWS_BY_ID[id]) // ignore saved ids for shows no longer in the catalog
        .map(([id, entry]) => ({ ...entry, show: SHOWS_BY_ID[id] })),
    [list],
  )
  const visible = sortEntries(filterEntries(entries, filter), sort)
  const counts = Object.fromEntries(Object.keys(FILTERS).map((key) => [key, filterEntries(entries, key).length]))
  const avg = averageRating(entries)
  const commentTotal = entries.reduce((sum, e) => sum + e.comments.length, 0)
  const suggestions = SHOWS.filter((s) => !list[s.id])
  const openEntry = openId && entries.find((e) => e.show.id === openId)

  return (
    <>
      <section aria-labelledby="mylist-heading">
        <div className="list-head">
          <div className="list-head__title">
            <h1 id="mylist-heading">My List</h1>
            <SyncStatus status={syncStatus} />
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

      {suggestions.length > 0 && (
        <section className="suggestions" aria-labelledby="suggestions-heading">
          <h2 id="suggestions-heading">Add to My List</h2>
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
        </section>
      )}

      {openEntry && <ShowModal entry={openEntry} actions={actions} onClose={closeModal} />}
    </>
  )
}
