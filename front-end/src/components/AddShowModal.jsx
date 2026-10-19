import { useState } from 'react'
import { useDialog } from '../hooks/useDialog.js'
import { GENRES } from '../data/shows.js'
import {
  EMPTY_SHOW_FORM,
  KINDS,
  MATURITY_RATINGS,
  SYNOPSIS_MAX,
  TITLE_MAX,
  formToShow,
  showFormError,
} from '../utils/libraryUtils.js'

// Dialog for adding a movie or series that isn't in the catalog.
export default function AddShowModal({ onAdd, onClose }) {
  const titleRef = useDialog(onClose)
  const [form, setForm] = useState(EMPTY_SHOW_FORM)
  const [addToMyList, setAddToMyList] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const error = showFormError(form)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (error) return
    onAdd(formToShow(form), addToMyList)
    onClose()
  }

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--form" role="dialog" aria-modal="true" aria-labelledby="add-show-title">
        <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <form className="show-form" onSubmit={handleSubmit} noValidate>
          <h2 id="add-show-title">Add a movie or show</h2>
          <p className="muted">Can't find it in the catalog? Add it yourself. Only you can see the titles you add.</p>

          <label className="field">
            <span className="label">Title</span>
            <input ref={titleRef} type="text" value={form.title} maxLength={TITLE_MAX} onChange={set('title')} />
          </label>

          <div className="field">
            <span className="label" id="kind-label">
              Type
            </span>
            <div className="segmented" role="group" aria-labelledby="kind-label">
              {Object.entries(KINDS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={form.kind === key}
                  onClick={() => setForm((f) => ({ ...f, kind: key }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="show-form__row">
            <label className="field">
              <span className="label">Year</span>
              <input type="number" min="1900" max="2100" value={form.year} onChange={set('year')} />
            </label>
            {form.kind === 'series' && (
              <label className="field">
                <span className="label">Seasons</span>
                <input type="number" min="1" value={form.seasons} onChange={set('seasons')} />
              </label>
            )}
            <label className="field">
              <span className="label">Genre</span>
              <select value={form.genre} onChange={set('genre')}>
                {GENRES.map((genre) => (
                  <option key={genre}>{genre}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Rating</span>
              <select value={form.maturity} onChange={set('maturity')}>
                {MATURITY_RATINGS.map((rating) => (
                  <option key={rating}>{rating}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span className="label">Synopsis (optional)</span>
            <textarea rows={3} value={form.synopsis} maxLength={SYNOPSIS_MAX} onChange={set('synopsis')} />
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={addToMyList} onChange={(e) => setAddToMyList(e.target.checked)} />
            Also add it to My List
          </label>

          {submitted && error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="show-form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Add title
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
