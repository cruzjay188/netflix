const NAV = ['Home', 'TV Shows', 'Movies', 'New & Popular', 'My List']

export default function Header() {
  return (
    <header className="header">
      <span className="logo">MYFLIX</span>
      <nav aria-label="Main">
        <ul className="nav">
          {NAV.map((item) => (
            <li key={item}>
              <a href="#" aria-current={item === 'My List' ? 'page' : undefined} onClick={(e) => e.preventDefault()}>
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="avatar" aria-hidden="true" />
    </header>
  )
}
