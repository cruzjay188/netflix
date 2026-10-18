import { useState } from 'react'
import ListNameForm from './ListNameForm.jsx'
import Poster from './Poster.jsx'

function ListBlock({ list, listsById, catalog, actions }) {
  const [renaming, setRenaming] = useState(false)
  const [choice, setChoice] = useState('')
  const shows = Object.entries(list.items)
    .filter(([showId]) => catalog[showId])
    .sort(([, a], [, b]) => b - a) // most recently added first
    .map(([showId]) => catalog[showId])
  const addable = Object.values(catalog).filter((show) => !(show.id in list.items))
  const headingId = `list-${list.id}`

  return (
    <section className="list-block" aria-labelledby={headingId}>
      <div className="list-block__head">
        {renaming ? (
          <ListNameForm
            lists={listsById}
            exceptId={list.id}
            initialName={list.name}
            label="List name"
            submitLabel="Save"
            autoFocus
            onSubmit={(name) => {
              actions.renameList(list.id, name)
              setRenaming(false)
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <>
            <h3 id={headingId}>
              {list.name} <span className="muted">({shows.length})</span>
            </h3>
            <button type="button" className="link-btn" onClick={() => setRenaming(true)} aria-label={`Rename ${list.name}`}>
              Rename
            </button>
            <button type="button" className="link-btn" onClick={() => actions.deleteList(list.id)} aria-label={`Delete ${list.name}`}>
              Delete
            </button>
          </>
        )}
      </div>

      {shows.length === 0 ? (
        <p className="muted">Nothing here yet. Pick a title below, or use “Your lists” when you open a show.</p>
      ) : (
        <ul className="row" aria-label={`Titles in ${list.name}`}>
          {shows.map((show) => (
            <li key={show.id} className="suggestion">
              <Poster show={show} />
              <button
                type="button"
                className="add-btn"
                aria-label={`Remove ${show.title} from ${list.name}`}
                onClick={() => actions.removeFromList(list.id, show.id)}
              >
                −
              </button>
            </li>
          ))}
        </ul>
      )}

      {addable.length > 0 && (
        <form
          className="list-block__add"
          onSubmit={(e) => {
            e.preventDefault()
            if (!choice) return
            actions.addToList(list.id, choice)
            setChoice('')
          }}
        >
          <select aria-label={`Title to add to ${list.name}`} value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Choose a title…</option>
            {addable.map((show) => (
              <option key={show.id} value={show.id}>
                {show.title}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn--ghost" disabled={!choice}>
            Add to list
          </button>
        </form>
      )}
    </section>
  )
}

// The user's own named lists, each with its titles and controls to edit it.
export default function ListsSection({ lists, catalog, actions }) {
  const listsById = Object.fromEntries(lists.map((list) => [list.id, list]))
  return (
    <section className="lists" aria-labelledby="lists-heading">
      <h2 id="lists-heading">Your lists</h2>
      <p className="muted">Group titles however you like: “Comfort shows”, “Watch with Dad”, “Best of 2026”…</p>
      <ListNameForm lists={listsById} label="New list name" submitLabel="Create list" onSubmit={actions.createList} />
      {lists.map((list) => (
        <ListBlock key={list.id} list={list} listsById={listsById} catalog={catalog} actions={actions} />
      ))}
    </section>
  )
}
