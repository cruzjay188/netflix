import Poster from './Poster.jsx'
import StarRating from './StarRating.jsx'
import { STATUSES } from '../utils/listUtils.js'

export default function ShowCard({ entry, onOpen }) {
  const { show, rating, status, comments } = entry
  return (
    <li>
      <button type="button" className="card" onClick={() => onOpen(show.id)} aria-label={`Open ${show.title}`}>
        <Poster show={show} />
        <span className="card__meta">
          <span className={`pill pill--${status}`}>{STATUSES[status]}</span>
          <StarRating value={rating} readOnly />
          {comments.length > 0 && (
            <span className="card__comments" aria-label={`${comments.length} comment${comments.length === 1 ? '' : 's'}`}>
              💬 {comments.length}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}
