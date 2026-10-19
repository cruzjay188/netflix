import { describe, expect, it } from 'vitest'
import {
  EMPTY_SHOW_FORM,
  buildCatalog,
  formToShow,
  isListNameTaken,
  posterColors,
  showFormError,
  sortedLists,
} from '../utils/libraryUtils.js'
import { combineSyncStatus } from '../utils/listUtils.js'
import { SHOWS } from '../data/shows.js'

describe('show form', () => {
  const valid = { ...EMPTY_SHOW_FORM, title: 'Interstellar', year: '2014' }

  it('needs a title, a sensible year, and seasons for a series', () => {
    expect(showFormError(valid)).toBeNull()
    expect(showFormError({ ...valid, title: '   ' })).toMatch(/title/)
    expect(showFormError({ ...valid, year: '1850' })).toMatch(/Year/)
    expect(showFormError({ ...valid, kind: 'series', seasons: '0' })).toMatch(/season/)
  })

  it('turns form text into a show, with no seasons for a movie', () => {
    expect(formToShow({ ...valid, title: ' Interstellar ', synopsis: ' Space. ' })).toEqual({
      title: 'Interstellar',
      kind: 'movie',
      year: 2014,
      seasons: null,
      genre: 'Comedy',
      maturity: 'PG-13',
      synopsis: 'Space.',
    })
    expect(formToShow({ ...valid, kind: 'series', seasons: '3' }).seasons).toBe(3)
  })
})

describe('catalog and lists', () => {
  it('puts custom titles first, newest first, with generated poster colors', () => {
    const catalog = buildCatalog({
      'u-old': { id: 'u-old', title: 'Old', createdAt: 1 },
      'u-new': { id: 'u-new', title: 'New', createdAt: 2 },
    })
    expect(Object.keys(catalog).slice(0, 2)).toEqual(['u-new', 'u-old'])
    expect(Object.keys(catalog)).toHaveLength(SHOWS.length + 2)
    expect(catalog['u-new']).toMatchObject({ custom: true, colors: posterColors('u-new') })
    expect(posterColors('u-new')).toEqual(posterColors('u-new'))
  })

  it('sorts lists oldest first and catches duplicate names, ignoring case', () => {
    const lists = { b: { name: 'Faves', createdAt: 2, items: {} }, a: { name: 'Comfort', createdAt: 1, items: {} } }
    expect(sortedLists(lists).map((l) => l.id)).toEqual(['a', 'b'])
    expect(isListNameTaken(lists, ' faves ')).toBe(true)
    expect(isListNameTaken(lists, 'Faves', 'b')).toBe(false) // renaming a list to its own name is fine
    expect(isListNameTaken(lists, 'Dad')).toBe(false)
  })
})

describe('combineSyncStatus', () => {
  it('shows the most worrying status', () => {
    expect(combineSyncStatus('synced', 'synced')).toBe('synced')
    expect(combineSyncStatus('synced', 'connecting')).toBe('connecting')
    expect(combineSyncStatus('error', 'synced')).toBe('error')
    expect(combineSyncStatus('local', 'local')).toBe('local')
  })
})
