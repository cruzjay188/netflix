import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { loadProfile, logIn, logOut, register } from '../lib/auth.js'
import { fallbackName } from '../utils/authUtils.js'

// status: 'local' (no Supabase configured: no accounts, the app runs on this device only)
//       | 'checking' (looking for a saved session) | 'signedOut' | 'signedIn'
export function useAuth({ client = supabase } = {}) {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [profile, setProfile] = useState(null)

  // Fires once with the saved session (INITIAL_SESSION), then on every log in, log out and token
  // refresh. Only sets state here: supabase-js asks not to await other calls inside this callback.
  useEffect(() => {
    if (!client) return
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [client])

  const user = session?.user ?? null
  const userId = user?.id

  useEffect(() => {
    setProfile(null)
    if (!client || !userId) return
    let cancelled = false
    loadProfile(client, userId)
      .then((row) => !cancelled && setProfile(row))
      .catch(() => {}) // the header falls back to the registered name
    return () => {
      cancelled = true
    }
  }, [client, userId])

  const status = !client ? 'local' : session === undefined ? 'checking' : session ? 'signedIn' : 'signedOut'
  return {
    status,
    user,
    name: profile?.display_name ?? fallbackName(user),
    register: (form) => register(client, form),
    logIn: (form) => logIn(client, form),
    logOut: () => logOut(client, userId),
  }
}
