import { describe, expect, it } from 'vitest'
import { createInitialState, listReducer } from '../hooks/useMyList.js'
import { STARTER_LIST } from '../data/shows.js'

describe('listReducer', () => {
  const base = createInitialState(1000)

  it('starts with the starter list, unrated and unwatched', () => {
    expect(Object.keys(base)).toEqual(STARTER_LIST)
    expect(base[STARTER_LIST[0]]).toEqual({ addedAt: 1000, status: 'want', rating: 0, comments: [] })
  })

  it('rates a show, and clicking the same rating clears it', () => {
    let s = listReducer(base, { type: 'rate', id: 'wednesday', rating: 4 })
    expect(s.wednesday.rating).toBe(4)
    s = listReducer(s, { type: 'rate', id: 'wednesday', rating: 4 })
    expect(s.wednesday.rating).toBe(0)
  })

  it('adds, edits and deletes comments newest-first', () => {
    let s = listReducer(base, { type: 'addComment', id: 'wednesday', commentId: 'a', text: 'first', spoiler: false, now: 1 })
    s = listReducer(s, { type: 'addComment', id: 'wednesday', commentId: 'b', text: 'second', spoiler: true, now: 2 })
    expect(s.wednesday.comments.map((c) => c.text)).toEqual(['second', 'first'])

    s = listReducer(s, { type: 'editComment', id: 'wednesday', commentId: 'a', text: 'edited', spoiler: false, now: 3 })
    expect(s.wednesday.comments[1]).toMatchObject({ text: 'edited', editedAt: 3 })

    s = listReducer(s, { type: 'deleteComment', id: 'wednesday', commentId: 'b' })
    expect(s.wednesday.comments.map((c) => c.id)).toEqual(['a'])
  })

  it('adds and removes shows without duplicating', () => {
    let s = listReducer(base, { type: 'add', id: 'arcane', now: 5 })
    expect(listReducer(s, { type: 'add', id: 'arcane', now: 6 })).toBe(s)
    s = listReducer(s, { type: 'remove', id: 'arcane' })
    expect(s.arcane).toBeUndefined()
  })

  it('ignores actions for shows not in the list', () => {
    expect(listReducer(base, { type: 'rate', id: 'nope', rating: 3 })).toBe(base)
  })
})
