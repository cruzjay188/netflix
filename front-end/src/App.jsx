import Header from './components/Header.jsx'
import { useAuth } from './hooks/useAuth.js'
import { supabase } from './lib/supabase.js'
import AuthPage from './views/AuthPage.jsx'
import MyList from './views/MyList.jsx'

// authClient is the supabase-js client (null without .env.local, and in most tests: the app then
// runs on this device only, with no accounts). Every page except Log in needs a logged-in user.
export default function App({ authClient = supabase }) {
  const auth = useAuth({ client: authClient })

  if (auth.status === 'checking') {
    return (
      <>
        <Header nav={false} />
        <main className="page">
          <p className="muted" role="status">
            Loading…
          </p>
        </main>
      </>
    )
  }

  if (auth.status === 'signedOut') {
    return (
      <>
        <Header nav={false} />
        <main className="page">
          <AuthPage auth={auth} />
        </main>
      </>
    )
  }

  const userId = auth.user?.id ?? null
  const account = auth.user && {
    name: auth.name,
    onLogOut: () => auth.logOut().catch((err) => console.error('Log out failed', err)),
  }
  return (
    <>
      <Header account={account} />
      <main className="page">
        {/* key: a different account gets a fresh page, never the previous user's state */}
        <MyList key={userId ?? 'local'} userId={userId} />
      </main>
    </>
  )
}
