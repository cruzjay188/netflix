import { useState } from 'react'
import { COMMENT_MAX, timeAgo } from '../utils/listUtils.js'

function CommentForm({ initialText = '', initialSpoiler = false, submitLabel, onSubmit, onCancel, autoFocus }) {
  const [text, setText] = useState(initialText)
  const [spoiler, setSpoiler] = useState(initialSpoiler)
  const trimmed = text.trim()

  function handleSubmit(e) {
    e.preventDefault()
    if (!trimmed) return
    onSubmit(trimmed, spoiler)
    if (!onCancel) {
      setText('')
      setSpoiler(false)
    }
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <textarea
        aria-label={submitLabel === 'Post' ? 'Write a comment' : 'Edit comment'}
        placeholder="What did you think? Favorite episode, characters, hot takes…"
        value={text}
        maxLength={COMMENT_MAX}
        rows={3}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="comment-form__row">
        <label className="checkbox">
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
          Contains spoilers
        </label>
        <span className="comment-form__count">
          {text.length}/{COMMENT_MAX}
        </span>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={!trimmed}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

function Comment({ comment, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const hidden = comment.spoiler && !revealed

  if (editing) {
    return (
      <li className="comment">
        <CommentForm
          initialText={comment.text}
          initialSpoiler={comment.spoiler}
          submitLabel="Save"
          autoFocus
          onSubmit={(text, spoiler) => {
            onEdit(comment.id, text, spoiler)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="comment">
      <div className="comment__head">
        <span className="comment__author">You</span>
        <span className="comment__time">
          {timeAgo(comment.createdAt)}
          {comment.editedAt && ' · edited'}
        </span>
        {comment.spoiler && <span className="pill pill--spoiler">Spoiler</span>}
      </div>
      {hidden ? (
        <button type="button" className="spoiler-cover" onClick={() => setRevealed(true)}>
          Spoiler hidden — click to reveal
        </button>
      ) : (
        <p className="comment__text">{comment.text}</p>
      )}
      <div className="comment__actions">
        <button type="button" className="link-btn" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" className="link-btn" onClick={() => onDelete(comment.id)}>
          Delete
        </button>
      </div>
    </li>
  )
}

export default function CommentSection({ comments, onAdd, onEdit, onDelete }) {
  return (
    <section className="comments" aria-labelledby="comments-heading">
      <h3 id="comments-heading">
        Your comments <span className="muted">({comments.length})</span>
      </h3>
      <CommentForm submitLabel="Post" onSubmit={onAdd} />
      {comments.length === 0 ? (
        <p className="muted empty-comments">No comments yet. Jot down your thoughts after an episode.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <Comment key={c.id} comment={c} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  )
}
