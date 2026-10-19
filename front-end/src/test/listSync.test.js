import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createRemote, diffStates, isEmptyDiff, rowsToState } from '../lib/listSync.js'
import { STORAGE_KEY, listReducer, useMyList } from '../hooks/useMyList.js'
import { STARTER_LIST } from '../data/shows.js'

// Minimal stand-in for the supabase-js client: records writes, returns canned rows.
function fakeClient({ entries = [], comments = [], failLoad = false } = {}) {
  const calls = []
  const ok = (data = null) => Promise.resolve({ data, error: null })
  return {
    calls,
    from(table) {
      return {
        select: () =>
          failLoad ? Promise.resolve({ data: null, error: new Error('offline') }) : ok(table === 'list_entries' ? entries : comments),
        upsert: (rows, opts) => {
          calls.push({ table, op: 'upsert', rows, opts })
          return ok()
        },
        delete: () => ({
          in: (column, values) => {
            calls.push({ table, op: 'delete', column, values })
            return ok()
          },
        }),
      }
    },
  }
}

const entryRow = { user_id: 'user-1', show_id: 'arcane', status: 'finished', rating: 5, added_at: '2026-10-01T00:00:00.000Z' }
const commentRows = [
  { id: 'c1', user_id: 'user-1', show_id: 'arcane', body: 'older', spoiler: false, created_at: '2026-10-01T01:00:00.000Z', edited_at: null },
  { id: 'c2', user_id: 'user-1', show_id: 'arcane', body: 'newer', spoiler: true, created_at: '2026-10-02T01:00:00.000Z', edited_at: '2026-10-03T01:00:00.000Z' },
]

describe('rowsToState', () => {
  it('converts database rows into reducer state, newest comment first', () => {
    const state = rowsToState([entryRow], commentRows)
    expect(state.arcane).toMatchObject({ status: 'finished', rating: 5, addedAt: Date.parse(entryRow.added_at) })
    expect(state.arcane.comments.map((c) => c.text)).toEqual(['newer', 'older'])
    expect(state.arcane.comments[0]).toMatchObject({ spoiler: true, editedAt: Date.parse('2026-10-03T01:00:00.000Z') })
    expect(state.arcane.comments[1]).not.toHaveProperty('editedAt')
  })
})

describe('diffStates', () => {
  const base = { wednesday: { addedAt: 1, status: 'want', rating: 0, comments: [] } }

  it('is empty when nothing changed', () => {
    expect(isEmptyDiff(diffStates(base, base))).toBe(true)
  })

  it('reports rating changes, new and deleted comments, and removed shows', () => {
    let next = listReducer(base, { type: 'rate', id: 'wednesday', rating: 4 })
    next = listReducer(next, { type: 'addComment', id: 'wednesday', commentId: 'c1', text: 'hi', spoiler: false, now: 5 })
    let ops = diffStates(base, next)
    expect(ops.upsertEntries.map((o) => o.entry.rating)).toEqual([4])
    expect(ops.upsertComments.map((o) => o.comment.id)).toEqual(['c1'])

    const afterDelete = listReducer(next, { type: 'deleteComment', id: 'wednesday', commentId: 'c1' })
    ops = diffStates(next, afterDelete)
    expect(ops).toMatchObject({ upsertEntries: [], deleteComments: ['c1'] })

    ops = diffStates(next, listReducer(next, { type: 'remove', id: 'wednesday' }))
    expect(ops).toMatchObject({ deleteEntries: ['wednesday'], deleteComments: [] })
  })
})

describe('createRemote', () => {
  it('writes entries before comments and never sends a user id', async () => {
    const client = fakeClient()
    const remote = createRemote(client)
    const next = { arcane: { addedAt: 1, status: 'want', rating: 3, comments: [{ id: 'c1', text: 'yo', spoiler: false, createdAt: 2 }] } }
    await remote.load()
    await remote.apply(diffStates({}, next))

    expect(client.calls.map((c) => `${c.table}:${c.op}`)).toEqual(['list_entries:upsert', 'list_comments:upsert'])
    expect(client.calls[0].rows[0]).toMatchObject({ show_id: 'arcane', rating: 3 })
    expect(client.calls[1].rows[0]).toMatchObject({ id: 'c1', body: 'yo', show_id: 'arcane' })
    // The database fills in user_id from the login (default auth.uid()).
    for (const call of client.calls) expect(call.rows[0]).not.toHaveProperty('user_id')
  })
})

describe('useMyList with Supabase', () => {
  it('loads the cloud list over the local one', async () => {
    const remote = createRemote(fakeClient({ entries: [entryRow], comments: commentRows }))
    const { result } = renderHook(() => useMyList({ remote }))
    expect(result.current.syncStatus).toBe('connecting')

    await waitFor(() => expect(result.current.syncStatus).toBe('synced'))
    expect(Object.keys(result.current.list)).toEqual(['arcane'])
  })

  it('uploads the local list when the cloud is empty, then syncs each change', async () => {
    const client = fakeClient()
    const remote = createRemote(client) // create once — a new remote per render would reload every time
    const { result } = renderHook(() => useMyList({ remote }))

    await waitFor(() => expect(client.calls).toHaveLength(1))
    expect(client.calls[0].rows.map((r) => r.show_id).sort()).toEqual([...STARTER_LIST].sort())

    act(() => result.current.rate('wednesday', 4))
    await waitFor(() => expect(client.calls).toHaveLength(2))
    expect(client.calls[1].rows).toEqual([expect.objectContaining({ show_id: 'wednesday', rating: 4 })])
  })

  it('starts a logged-in account empty and keeps its copy under its own key', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ arcane: { addedAt: 1, status: 'want', rating: 0, comments: [] } }))
    const client = fakeClient()
    const remote = createRemote(client)
    const { result } = renderHook(() => useMyList({ remote, userId: 'user-1' }))
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'))
    expect(result.current.list).toEqual({}) // not the starter list, and not the device-only list

    act(() => result.current.add('wednesday'))
    await waitFor(() => expect(client.calls).toHaveLength(1))
    expect(Object.keys(JSON.parse(localStorage.getItem(`${STORAGE_KEY}:user-1`)))).toEqual(['wednesday'])
  })

  it('falls back to the local list when Supabase is unreachable', async () => {
    const remote = createRemote(fakeClient({ failLoad: true }))
    const { result } = renderHook(() => useMyList({ remote }))
    await waitFor(() => expect(result.current.syncStatus).toBe('error'))
    expect(Object.keys(result.current.list)).toEqual(STARTER_LIST)
  })
})
