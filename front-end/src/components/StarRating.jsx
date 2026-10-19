import { useState } from 'react'

function Star({ filled }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? 'star star--on' : 'star'}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" />
    </svg>
  )
}

// Interactive 1–5 star picker. Clicking the current rating clears it (handled by the reducer).
// With `readOnly`, renders a compact display for cards.
export default function StarRating({ value, onChange, readOnly = false, label = 'Your rating' }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value

  if (readOnly) {
    return (
      <span className="stars stars--small" aria-label={value ? `Rated ${value} out of 5` : 'Not rated'}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= value} />
        ))}
      </span>
    )
  }

  return (
    <div className="stars" role="group" aria-label={label} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="stars__btn"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={n === value}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          <Star filled={n <= shown} />
        </button>
      ))}
      <span className="stars__hint">{value ? `${value} / 5` : 'Tap to rate'}</span>
    </div>
  )
}
