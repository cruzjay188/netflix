// Keeps the library (the user's own shows + named lists) in sync with Supabase, the same way
// listSync.js does for My List: diff each reducer state against the last synced one and send
// only the rows that changed.

import { check, isEmptyDiff } from './listSync.js'
import { getUserId } from './session.js'

const iso = (ms) => new Date(ms).toISOString()

export function showToRow(userId, show, genreIds) {
  const genreId = genreIds[show.genre]
  if (!genreId) throw new Error(`Unknown genre: ${show.genre}`)
  return {
    id: show.id,
    created_by: userId,
    title: show.title,
    kind: show.kind,
    release_year: show.year,
    seasons: show.seasons,
    maturity_rating: show.maturity,
    synopsis: show.synopsis,
    genre_id: genreId,
    created_at: iso(show.createdAt),
  }
}

export function listToRow(userId, listId, list) {
  return { id: listId, user_id: userId, name: list.name, created_at: iso(list.createdAt) }
}

export function itemToRow(userId, listId, showId, addedAt) {
  return { list_id: listId, show_id: showId, user_id: userId, added_at: iso(addedAt) }
}

export function rowsToLibrary(showRows, listRows, itemRows) {
  const customShows = {}
  for (const row of showRows) {
    customShows[row.id] = {
      id: row.id,
      title: row.title,
      kind: row.kind,
      year: row.release_year,
      seasons: row.seasons,
      genre: row.genres.name,
      maturity: row.maturity_rating,
      synopsis: row.synopsis,
      createdAt: Date.parse(row.created_at),
    }
  }
  const lists = {}
  for (const row of listRows) lists[row.id] = { name: row.name, createdAt: Date.parse(row.created_at), items: {} }
  for (const row of itemRows) {
    if (lists[row.list_id]) lists[row.list_id].items[row.show_id] = Date.parse(row.added_at)
  }
  return { customShows, lists }
}

// What changed between two library states, as row-level operations.
export function diffLibrary(prev, next) {
  const ops = { upsertShows: [], upsertLists: [], upsertItems: [], deleteItems: [], deleteLists: [], deleteShows: [] }
  for (const [id, show] of Object.entries(next.customShows)) {
    if (prev.customShows[id] !== show) ops.upsertShows.push(show)
  }
  for (const id of Object.keys(prev.customShows)) if (!next.customShows[id]) ops.deleteShows.push(id)

  for (const [listId, list] of Object.entries(next.lists)) {
    const old = prev.lists[listId]
    if (old === list) continue // reducer returns the same object when nothing changed
    if (!old || old.name !== list.name) ops.upsertLists.push({ listId, list })
    for (const [showId, addedAt] of Object.entries(list.items)) {
      if (old?.items[showId] !== addedAt) ops.upsertItems.push({ listId, showId, addedAt })
    }
    for (const showId of Object.keys(old?.items ?? {})) {
      if (!(showId in list.items)) ops.deleteItems.push({ listId, showId })
    }
  }
  // Deleting a list cascades to its items in the database.
  for (const listId of Object.keys(prev.lists)) if (!next.lists[listId]) ops.deleteLists.push(listId)
  return ops
}

export function createLibraryRemote(client) {
  let genreIds = {} // { [genre name]: genres.id }, filled by load()

  return {
    async load() {
      await getUserId(client)
      const [genres, shows, lists, items] = await Promise.all([
        client.from('genres').select('id, name'),
        // RLS only returns this user's custom shows; the built-in catalog has created_by = null.
        client.from('shows').select('*, genres(name)').not('created_by', 'is', null),
        client.from('lists').select('*'),
        client.from('list_items').select('*'),
      ])
      for (const result of [genres, shows, lists, items]) if (result.error) throw result.error
      genreIds = Object.fromEntries(genres.data.map((g) => [g.name, g.id]))
      return rowsToLibrary(shows.data, lists.data, items.data)
    },

    async apply(ops) {
      if (isEmptyDiff(ops)) return
      const userId = await getUserId(client)
      // Order matters: items reference lists and shows.
      if (ops.upsertShows.length) {
        await check(client.from('shows').upsert(ops.upsertShows.map((show) => showToRow(userId, show, genreIds))))
      }
      if (ops.upsertLists.length) {
        await check(client.from('lists').upsert(ops.upsertLists.map(({ listId, list }) => listToRow(userId, listId, list))))
      }
      if (ops.upsertItems.length) {
        await check(
          client
            .from('list_items')
            .upsert(
              ops.upsertItems.map(({ listId, showId, addedAt }) => itemToRow(userId, listId, showId, addedAt)),
              { onConflict: 'list_id,show_id' },
            ),
        )
      }
      for (const { listId, showId } of ops.deleteItems) {
        await check(client.from('list_items').delete().eq('list_id', listId).eq('show_id', showId))
      }
      if (ops.deleteLists.length) await check(client.from('lists').delete().in('id', ops.deleteLists))
      if (ops.deleteShows.length) await check(client.from('shows').delete().in('id', ops.deleteShows))
    },
  }
}
