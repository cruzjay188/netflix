import { useDialog } from '../hooks/useDialog.js'
import Poster from './Poster.jsx'
import StarRating from './StarRating.jsx'
import CommentSection from './CommentSection.jsx'
import ListPicker from './ListPicker.jsx'
import { STATUSES } from '../utils/listUtils.js'

// listActions: { toggle(showId, listId), create(showId, name), deleteShow(showId) } from the library.
export default function ShowModal({ entry, lists, actions, listActions, onClose }) {
  const { show, rating, status, comments } = entry
  const closeRef = useDialog(onClose)

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
            {show.seasons ? (
              <span>
                {show.seasons} season{show.seasons > 1 ? 's' : ''}
              </span>
            ) : (
              <span>Movie</span>
            )}
            <span>{show.genre}</span>
            {show.custom && <span className="pill">Added by you</span>}
          </p>
          {show.synopsis && <p className="modal__synopsis">{show.synopsis}</p>}

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

          <ListPicker
            show={show}
            lists={lists}
            onToggle={(listId) => listActions.toggle(show.id, listId)}
            onCreate={(name) => listActions.create(show.id, name)}
          />

          <CommentSection
            comments={comments}
            onAdd={(text, spoiler) => actions.addComment(show.id, text, spoiler)}
            onEdit={(commentId, text, spoiler) => actions.editComment(show.id, commentId, text, spoiler)}
            onDelete={(commentId) => actions.deleteComment(show.id, commentId)}
          />

          <div className="modal__danger">
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
            {show.custom && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  listActions.deleteShow(show.id)
                  onClose()
                }}
              >
                Delete this title from Myflix
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
