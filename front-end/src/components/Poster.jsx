// Poster art: a gradient in the show's colors with the title set on top. TMDB titles also have
// a real image (posterUrl), drawn over the gradient, which shows while it loads or if it fails.
export default function Poster({ show, size = 'card' }) {
  const [from, to] = show.colors
  return (
    <div className={`poster poster--${size}`} style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}>
      {/* alt="": the title is already written on the poster */}
      {show.posterUrl && <img className="poster__img" src={show.posterUrl} alt="" loading="lazy" />}
      <span className="poster__badge" aria-hidden="true">
        M
      </span>
      <span className="poster__title">{show.title}</span>
    </div>
  )
}
