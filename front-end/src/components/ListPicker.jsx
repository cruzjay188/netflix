import ListNameForm from './ListNameForm.jsx'

// Inside the show dialog: toggle the show in and out of each list, or start a new list with it.
export default function ListPicker({ show, lists, onToggle, onCreate }) {
  const byId = Object.fromEntries(lists.map((list) => [list.id, list]))
  return (
    <section className="list-picker" aria-labelledby="list-picker-heading">
      <h3 id="list-picker-heading" className="label">
        Your lists
      </h3>
      {lists.length > 0 && (
        <div className="chips" role="group" aria-label={`Lists with ${show.title}`}>
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              className="chip"
              aria-pressed={show.id in list.items}
              onClick={() => onToggle(list.id)}
            >
              {list.name}
            </button>
          ))}
        </div>
      )}
      <ListNameForm lists={byId} label="New list name" submitLabel="New list with this title" onSubmit={onCreate} />
    </section>
  )
}
