// Generated poster art: a gradient in the show's colors with the title set on top.
export default function Poster({ show, size = 'card' }) {
  const [from, to] = show.colors
  return (
    <div className={`poster poster--${size}`} style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}>
      <span className="poster__badge" aria-hidden="true">
        M
      </span>
      <span className="poster__title">{show.title}</span>
    </div>
  )
}
