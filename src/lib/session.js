// Shared by every remote (My List, library) so they act as one user and write in one order.

// One anonymous user per browser; supabase-js keeps the session in localStorage.
// Cached per client so two remotes loading at once can't each create their own account.
const userIds = new WeakMap()

export function getUserId(client) {
  if (!userIds.has(client)) {
    const promise = (async () => {
      const { data } = await client.auth.getSession()
      if (data.session) return data.session.user.id
      const { data: signIn, error } = await client.auth.signInAnonymously()
      if (error) throw error
      return signIn.user.id
    })()
    promise.catch(() => userIds.delete(client)) // allow a retry next time
    userIds.set(client, promise)
  }
  return userIds.get(client)
}

// Every write to Supabase runs through this queue in the order the changes happened.
// My List rows point at shows, so a custom show added a moment ago has to reach the
// database before the list entry that references it.
let tail = Promise.resolve()

export function enqueue(task) {
  const run = tail.then(task)
  tail = run.catch(() => {}) // a failed batch doesn't block the ones after it
  return run
}
