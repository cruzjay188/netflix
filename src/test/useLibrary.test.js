import { describe, expect, it } from 'vitest'
import { EMPTY_LIBRARY, libraryReducer } from '../hooks/useLibrary.js'

const movie = { id: 'u-1', title: 'Interstellar', kind: 'movie', year: 2014, seasons: null, genre: 'Sci-Fi', maturity: 'PG-13', synopsis: '', createdAt: 1 }

function withList(state = EMPTY_LIBRARY, listId = 'l1', name = 'Faves') {
  return libraryReducer(state, { type: 'createList', listId, name, now: 10 })
}

describe('libraryReducer', () => {
  it('adds a custom show', () => {
    const s = libraryReducer(EMPTY_LIBRARY, { type: 'addShow', show: movie })
    expect(s.customShows['u-1']).toBe(movie)
  })

  it('creates, renames and deletes lists, refusing duplicate names', () => {
    let s = withList()
    expect(s.lists.l1).toEqual({ name: 'Faves', createdAt: 10, items: {} })
    expect(withList(s, 'l2', 'faves')).toBe(s)

    s = libraryReducer(s, { type: 'renameList', listId: 'l1', name: 'Comfort shows' })
    expect(s.lists.l1.name).toBe('Comfort shows')

    s = libraryReducer(s, { type: 'deleteList', listId: 'l1' })
    expect(s.lists).toEqual({})
  })

  it('adds and removes titles in a list without duplicating', () => {
    let s = libraryReducer(withList(), { type: 'addToList', listId: 'l1', showId: 'arcane', now: 20 })
    expect(s.lists.l1.items).toEqual({ arcane: 20 })
    expect(libraryReducer(s, { type: 'addToList', listId: 'l1', showId: 'arcane', now: 30 })).toBe(s)

    s = libraryReducer(s, { type: 'removeFromList', listId: 'l1', showId: 'arcane' })
    expect(s.lists.l1.items).toEqual({})
  })

  it('deleting a custom show also takes it out of every list', () => {
    let s = libraryReducer(withList(), { type: 'addShow', show: movie })
    s = libraryReducer(s, { type: 'addToList', listId: 'l1', showId: 'u-1', now: 20 })
    s = libraryReducer(s, { type: 'addToList', listId: 'l1', showId: 'arcane', now: 21 })

    s = libraryReducer(s, { type: 'deleteShow', id: 'u-1' })
    expect(s.customShows).toEqual({})
    expect(s.lists.l1.items).toEqual({ arcane: 21 })
  })

  it('ignores actions for lists that do not exist', () => {
    expect(libraryReducer(EMPTY_LIBRARY, { type: 'addToList', listId: 'nope', showId: 'arcane', now: 1 })).toBe(EMPTY_LIBRARY)
  })
})
