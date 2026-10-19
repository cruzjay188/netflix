// Email + password accounts through Supabase Auth. Components use these through useAuth,
// never supabase directly. supabase-js keeps the session in localStorage and refreshes the
// access token by itself, which is why a refresh keeps you logged in.

import { enqueue } from './session.js'

// Throws Supabase's error so the form can show a friendly message (utils/authUtils.js).
function unwrap({ data, error }) {
  if (error) throw error
  return data
}

// The name goes into the account's metadata; the database trigger copies it into profiles.
// Returns { needsConfirmation: true } when the project still has "Confirm email" on.
export async function register(client, { name, email, password }) {
  const data = unwrap(
    await client.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } }),
  )
  return { needsConfirmation: !data.session }
}

export async function logIn(client, { email, password }) {
  unwrap(await client.auth.signInWithPassword({ email: email.trim(), password }))
}

// Lets pending writes finish while the user is still logged in, then ends the session and
// removes this browser's copy of their data.
export async function logOut(client, userId) {
  await enqueue(() => {})
  unwrap(await client.auth.signOut())
  forgetLocalData(userId)
}

// RLS only returns the logged-in user's own profile.
export async function loadProfile(client, userId) {
  return unwrap(await client.from('profiles').select('display_name, avatar_color').eq('id', userId).maybeSingle())
}

// Removes every Myflix key saved for this user (see userStorageKey in utils/authUtils.js).
export function forgetLocalData(userId) {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    for (const key of keys) {
      if (key?.startsWith('myflix:') && key.endsWith(`:${userId}`)) localStorage.removeItem(key)
    }
  } catch {
    // Storage unavailable: nothing was saved, so nothing to remove.
  }
}
