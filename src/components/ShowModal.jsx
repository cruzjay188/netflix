import { useEffect, useRef } from 'react'
import Poster from './Poster.jsx'
import StarRating from './StarRating.jsx'
import CommentSection from './CommentSection.jsx'
import { STATUSES } from '../utils/listUtils.js'

export default function ShowModal({ entry, actions, onClose }) {
  const { show, rating, status, comments } = entry
  const closeRef = useRef(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button ref={closeRef} type="button" className="modal__close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <Poster show={show} size="hero" />
        <div className="modal__body">
          <h2 id="modal-title">{show.title}</h2>
          <p className="modal__facts">
            <span>{show.year}</span>
            <span className="maturity">{show.maturity}</span>
            <span>
              {show.seasons} season{show.seasons > 1 ? 's' : ''}
            </span>
            <span>{show.genre}</span>
          </p>
          <p className="modal__synopsis">{show.synopsis}</p>

          <div className="modal__controls">
            <div>
              <h3 className="label">Your rating</h3>
              <StarRating value={rating} onChange={(n) => actions.rate(show.id, n)} />
            </div>
            <div>
              <h3 className="label">Status</h3>
              <div className="segmented" role="group" aria-label="Watch status">
                {Object.entries(STATUSES).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={status === key}
                    onClick={() => actions.setStatus(show.id, key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <CommentSection
            comments={comments}
            onAdd={(text, spoiler) => actions.addComment(show.id, text, spoiler)}
            onEdit={(commentId, text, spoiler) => actions.editComment(show.id, commentId, text, spoiler)}
            onDelete={(commentId) => actions.deleteComment(show.id, commentId)}
          />

          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              actions.remove(show.id)
              onClose()
            }}
          >
            Remove from My List
          </button>
        </div>
      </div>
    </div>
  )
}
