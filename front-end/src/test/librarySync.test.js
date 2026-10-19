import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createLibraryRemote, diffLibrary, rowsToLibrary } from '../lib/librarySync.js'
import { isEmptyDiff } from '../lib/listSync.js'
import { EMPTY_LIBRARY, LIBRARY_KEY, libraryReducer, useLibrary } from '../hooks/useLibrary.js'

// Minimal stand-in for the supabase-js client: records writes, returns canned rows.
function fakeClient(rows = {}) {
  const calls = []
  const ok = (data = null) => Promise.resolve({ data, error: null })
  const data = { genres: [{ id: 1, name: 'Sci-Fi' }], shows: [], lists: [], list_items: [], list_entries: [], list_comments: [], ...rows }
  return {
    calls,
    from(table) {
      return {
        select: () => Object.assign(ok(data[table]), { not: () => ok(data[table]) }),
        upsert: (rows, opts) => {
          calls.push({ table, op: 'upsert', rows, opts })
          return ok()
        },
        delete: () => {
          const filters = []
          const chain = {
            eq: (column, value) => {
              filters.push([column, value])
              return filters.length === 2 ? record() : chain
            },
            in: (column, values) => {
              filters.push([column, values])
              return record()
            },
          }
          const record = () => {
            calls.push({ table, op: 'delete', filters })
            return ok()
          }
          return chain
        },
      }
    },
  }
}

const showRow = {
  id: 'u-1', created_by: 'user-1', title: 'Interstellar', kind: 'movie', release_year: 2014, seasons: null,
  maturity_rating: 'PG-13', synopsis: '', genre_id: 1, genres: { name: 'Sci-Fi' }, created_at: '2026-10-18T00:00:00.000Z',
}
const listRow = { id: 'l1', user_id: 'user-1', name: 'Faves', created_at: '2026-10-18T01:00:00.000Z' }
const itemRow = { list_id: 'l1', show_id: 'u-1', user_id: 'user-1', added_at: '2026-10-18T02:00:00.000Z' }

describe('rowsToLibrary', () => {
  it('converts database rows into library state', () => {
    const state = rowsToLibrary([showRow], [listRow], [itemRow])
    expect(state.customShows['u-1']).toMatchObject({ title: 'Interstellar', year: 2014, genre: 'Sci-Fi', seasons: null })
    expect(state.lists.l1).toEqual({ name: 'Faves', createdAt: Date.parse(listRow.created_at), items: { 'u-1': Date.parse(itemRow.added_at) } })
  })
})

describe('diffLibrary', () => {
  const show = { id: 'u-1', title: 'Interstellar', kind: 'movie', year: 2014, seasons: null, genre: 'Sci-Fi', maturity: 'PG-13', synopsis: '', createdAt: 1 }

  it('is empty when nothing changed', () => {
    expect(isEmptyDiff(diffLibrary(EMPTY_LIBRARY, EMPTY_LIBRARY))).toBe(true)
  })

  it('reports new shows, lists and items, then renames, removals and deletions', () => {
    let next = libraryReducer(EMPTY_LIBRARY, { type: 'addShow', show })
    next = libraryReducer(next, { type: 'createList', listId: 'l1', name: 'Faves', now: 2 })
    next = libraryReducer(next, { type: 'addToList', listId: 'l1', showId: 'u-1', now: 3 })
    let ops = diffLibrary(EMPTY_LIBRARY, next)
    expect(ops.upsertShows).toEqual([show])
    expect(ops.upsertLists.map((o) => o.listId)).toEqual(['l1'])
    expect(ops.upsertItems).toEqual([{ listId: 'l1', showId: 'u-1', addedAt: 3 }])

    const renamed = libraryReducer(next, { type: 'renameList', listId: 'l1', name: 'Best' })
    ops = diffLibrary(next, renamed)
    expect(ops).toMatchObject({ upsertLists: [{ listId: 'l1' }], upsertItems: [], upsertShows: [] })

    ops = diffLibrary(next, libraryReducer(next, { type: 'deleteShow', id: 'u-1' }))
    expect(ops).toMatchObject({ deleteShows: ['u-1'], deleteItems: [{ listId: 'l1', showId: 'u-1' }] })

    ops = diffLibrary(next, libraryReducer(next, { type: 'deleteList', listId: 'l1' }))
    expect(ops).toMatchObject({ deleteLists: ['l1'], deleteItems: [] })
  })
})

describe('createLibraryRemote', () => {
  it('writes shows, then lists, then items, mapping genre names to ids', async () => {
    const client = fakeClient()
    const remote = createLibraryRemote(client)
    await remote.load()
    let next = libraryReducer(EMPTY_LIBRARY, {
      type: 'addShow',
      show: { id: 'u-1', title: 'Interstellar', kind: 'movie', year: 2014, seasons: null, genre: 'Sci-Fi', maturity: 'PG-13', synopsis: '', createdAt: 1 },
    })
    next = libraryReducer(next, { type: 'createList', listId: 'l1', name: 'Faves', now: 2 })
    next = libraryReducer(next, { type: 'addToList', listId: 'l1', showId: 'u-1', now: 3 })
    await remote.apply(diffLibrary(EMPTY_LIBRARY, next))

    expect(client.calls.map((c) => `${c.table}:${c.op}`)).toEqual(['shows:upsert', 'lists:upsert', 'list_items:upsert'])
    expect(client.calls[0].rows[0]).toMatchObject({ id: 'u-1', genre_id: 1, release_year: 2014 })
    expect(client.calls[2].rows[0]).toMatchObject({ list_id: 'l1', show_id: 'u-1' })
    // The database fills in the owner from the login (default auth.uid()).
    expect(client.calls[0].rows[0]).not.toHaveProperty('created_by')
    for (const call of client.calls.slice(1)) expect(call.rows[0]).not.toHaveProperty('user_id')
  })
})

describe('useLibrary with Supabase', () => {
  it('loads the cloud library over the local one', async () => {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify({ customShows: {}, lists: { old: { name: 'Local', createdAt: 1, items: {} } } }))
    const remote = createLibraryRemote(fakeClient({ shows: [showRow], lists: [listRow], list_items: [itemRow] }))
    const { result } = renderHook(() => useLibrary({ remote }))

    await waitFor(() => expect(result.current.syncStatus).toBe('synced'))
    expect(Object.keys(result.current.library.lists)).toEqual(['l1'])
    expect(result.current.library.customShows['u-1'].title).toBe('Interstellar')
  })

  it('syncs each change after the first load', async () => {
    const client = fakeClient()
    const remote = createLibraryRemote(client) // create once — a new remote per render would reload every time
    const { result } = renderHook(() => useLibrary({ remote }))
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'))

    act(() => {
      result.current.createList('Faves')
    })
    await waitFor(() => expect(client.calls).toHaveLength(1))
    expect(client.calls[0]).toMatchObject({ table: 'lists', op: 'upsert' })
    expect(client.calls[0].rows[0]).toMatchObject({ name: 'Faves' })
    expect(client.calls[0].rows[0]).not.toHaveProperty('user_id')
  })
})
