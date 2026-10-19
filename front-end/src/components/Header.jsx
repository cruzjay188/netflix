const NAV = ['Home', 'TV Shows', 'Movies', 'New & Popular', 'My List']

// nav: false on the Log in page. account: { name, onLogOut } when someone is logged in.
export default function Header({ nav = true, account = null }) {
  return (
    <header className="header">
      <span className="logo">MYFLIX</span>
      {nav && (
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
      )}
      {nav && (
        <div className="account">
          {account && <span className="account__name">{account.name}</span>}
          <span className="avatar" aria-hidden="true" />
          {account && (
            <button type="button" className="btn btn--ghost account__logout" onClick={account.onLogOut}>
              Log out
            </button>
          )}
        </div>
      )}
    </header>
  )
}
