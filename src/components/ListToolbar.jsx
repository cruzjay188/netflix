import { FILTERS, SORTS } from '../utils/listUtils.js'

export default function ListToolbar({ filter, onFilter, sort, onSort, counts }) {
  return (
    <div className="toolbar">
      <div className="chips" role="group" aria-label="Filter shows">
        {Object.entries(FILTERS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="chip"
            aria-pressed={filter === key}
            onClick={() => onFilter(key)}
          >
            {label} <span className="chip__count">{counts[key]}</span>
          </button>
        ))}
      </div>
      <label className="sort">
        Sort by
        <select value={sort} onChange={(e) => onSort(e.target.value)}>
          {Object.entries(SORTS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
