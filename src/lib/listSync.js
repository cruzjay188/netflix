// Keeps the My List reducer state in sync with Supabase.
// The reducer stays the source of truth; we diff each new state against the last synced one
// and send only the rows that changed, so every reducer action syncs without extra wiring.

import { getUserId } from './session.js'

const iso = (ms) => new Date(ms).toISOString()

// Throws the error from a supabase-js response so a failed write stops the batch.
export async function check(promise) {
  const { error } = await promise
  if (error) throw error
}

export function entryToRow(userId, showId, entry) {
  return { user_id: userId, show_id: showId, status: entry.status, rating: entry.rating, added_at: iso(entry.addedAt) }
}

export function commentToRow(userId, showId, comment) {
  return {
    id: comment.id,
    user_id: userId,
    show_id: showId,
    body: comment.text,
    spoiler: comment.spoiler,
    created_at: iso(comment.createdAt),
    edited_at: comment.editedAt ? iso(comment.editedAt) : null,
  }
}

export function rowsToState(entryRows, commentRows) {
  const state = {}
  for (const row of entryRows) {
    state[row.show_id] = { addedAt: Date.parse(row.added_at), status: row.status, rating: row.rating, comments: [] }
  }
  for (const row of commentRows) {
    const entry = state[row.show_id]
    if (!entry) continue
    entry.comments.push({
      id: row.id,
      text: row.body,
      spoiler: row.spoiler,
      createdAt: Date.parse(row.created_at),
      ...(row.edited_at && { editedAt: Date.parse(row.edited_at) }),
    })
  }
  for (const entry of Object.values(state)) entry.comments.sort((a, b) => b.createdAt - a.createdAt)
  return state
}

// What changed between two reducer states, as row-level operations.
export function diffStates(prev, next) {
  const ops = { upsertEntries: [], upsertComments: [], deleteComments: [], deleteEntries: [] }
  for (const [showId, entry] of Object.entries(next)) {
    const old = prev[showId]
    if (old === entry) continue // reducer returns the same object when nothing changed
    if (!old || old.status !== entry.status || old.rating !== entry.rating || old.addedAt !== entry.addedAt) {
      ops.upsertEntries.push({ showId, entry })
    }
    const oldComments = new Map((old?.comments ?? []).map((c) => [c.id, c]))
    for (const comment of entry.comments) {
      if (oldComments.get(comment.id) !== comment) ops.upsertComments.push({ showId, comment })
      oldComments.delete(comment.id)
    }
    ops.deleteComments.push(...oldComments.keys())
  }
  // Removing an entry cascades to its comments in the database.
  for (const showId of Object.keys(prev)) if (!next[showId]) ops.deleteEntries.push(showId)
  return ops
}

export function isEmptyDiff(ops) {
  return Object.values(ops).every((list) => list.length === 0)
}

export function createRemote(client) {
  return {
    async load() {
      await getUserId(client)
      const [entries, comments] = await Promise.all([
        client.from('list_entries').select('*'),
        client.from('list_comments').select('*'),
      ])
      if (entries.error) throw entries.error
      if (comments.error) throw comments.error
      return rowsToState(entries.data, comments.data)
    },

    async apply(ops) {
      if (isEmptyDiff(ops)) return
      const userId = await getUserId(client)
      // Order matters: comments reference entries.
      if (ops.upsertEntries.length) {
        await check(
          client
            .from('list_entries')
            .upsert(ops.upsertEntries.map(({ showId, entry }) => entryToRow(userId, showId, entry)), {
              onConflict: 'user_id,show_id',
            }),
        )
      }
      if (ops.upsertComments.length) {
        await check(
          client
            .from('list_comments')
            .upsert(ops.upsertComments.map(({ showId, comment }) => commentToRow(userId, showId, comment))),
        )
      }
      if (ops.deleteComments.length) {
        await check(client.from('list_comments').delete().in('id', ops.deleteComments))
      }
      if (ops.deleteEntries.length) {
        await check(client.from('list_entries').delete().in('show_id', ops.deleteEntries))
      }
    },
  }
}
