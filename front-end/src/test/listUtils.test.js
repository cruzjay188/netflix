import { describe, expect, it } from 'vitest'
import { averageRating, filterEntries, sortEntries, timeAgo } from '../utils/listUtils.js'

const entry = (title, rating, status, addedAt) => ({ show: { title }, rating, status, addedAt, comments: [] })
const entries = [
  entry('Wednesday', 4, 'watching', 3),
  entry('Arcane', 0, 'want', 2),
  entry('Squid Game', 5, 'finished', 1),
]

describe('listUtils', () => {
  it('filters by status and by unrated', () => {
    expect(filterEntries(entries, 'all')).toHaveLength(3)
    expect(filterEntries(entries, 'finished').map((e) => e.show.title)).toEqual(['Squid Game'])
    expect(filterEntries(entries, 'unrated').map((e) => e.show.title)).toEqual(['Arcane'])
  })

  it('sorts by recency, rating (unrated last) and title', () => {
    const titles = (sort) => sortEntries(entries, sort).map((e) => e.show.title)
    expect(titles('recent')).toEqual(['Wednesday', 'Arcane', 'Squid Game'])
    expect(titles('rating')).toEqual(['Squid Game', 'Wednesday', 'Arcane'])
    expect(titles('title')).toEqual(['Arcane', 'Squid Game', 'Wednesday'])
  })

  it('averages only rated shows', () => {
    expect(averageRating(entries)).toBe(4.5)
    expect(averageRating([entry('X', 0, 'want', 1)])).toBeNull()
  })

  it('formats relative times', () => {
    const now = 1_000_000_000
    expect(timeAgo(now - 5_000, now)).toBe('just now')
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5m ago')
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3h ago')
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe('2d ago')
  })
})
