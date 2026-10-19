// Shared by every remote (My List, library) so they write in one order.
// Who the user is comes from their login (lib/auth.js): supabase-js sends the access token with
// every request, and the database fills in user_id with auth.uid(). The app never sends one.

// Every write to Supabase runs through this queue in the order the changes happened.
// My List rows point at shows, so a custom show added a moment ago has to reach the
// database before the list entry that references it.
let tail = Promise.resolve()

export function enqueue(task) {
  const run = tail.then(task)
  tail = run.catch(() => {}) // a failed batch doesn't block the ones after it
  return run
}
