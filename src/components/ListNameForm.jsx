import { useState } from 'react'
import { LIST_NAME_MAX, isListNameTaken } from '../utils/libraryUtils.js'

// Name input for creating or renaming a list. Blocks empty and duplicate names.
export default function ListNameForm({ lists, exceptId = null, initialName = '', label, submitLabel, onSubmit, onCancel, autoFocus }) {
  const [name, setName] = useState(initialName)
  const trimmed = name.trim()
  const taken = trimmed !== '' && isListNameTaken(lists, trimmed, exceptId)

  function handleSubmit(e) {
    e.preventDefault()
    if (!trimmed || taken) return
    onSubmit(trimmed)
    if (!onCancel) setName('')
  }

  return (
    <form className="list-name-form" onSubmit={handleSubmit}>
      <input
        type="text"
        aria-label={label}
        placeholder="e.g. Comfort shows"
        value={name}
        maxLength={LIST_NAME_MAX}
        autoFocus={autoFocus}
        onChange={(e) => setName(e.target.value)}
      />
      {onCancel && (
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      )}
      <button type="submit" className="btn btn--primary" disabled={!trimmed || taken}>
        {submitLabel}
      </button>
      {taken && (
        <p className="form-error" role="alert">
          You already have a list called “{trimmed}”.
        </p>
      )}
    </form>
  )
}
