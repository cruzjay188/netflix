export const STATUSES = {
  want: 'Want to watch',
  watching: 'Watching',
  finished: 'Finished',
}

export const FILTERS = {
  all: 'All',
  watching: 'Watching',
  finished: 'Finished',
  want: 'Want to watch',
  unrated: 'Unrated',
}

export const SORTS = {
  recent: 'Recently added',
  rating: 'Highest rated',
  title: 'Title A–Z',
}

export const COMMENT_MAX = 500

export function filterEntries(entries, filter) {
  if (filter === 'all') return entries
  if (filter === 'unrated') return entries.filter((e) => !e.rating)
  return entries.filter((e) => e.status === filter)
}

export function sortEntries(entries, sort) {
  const copy = [...entries]
  if (sort === 'title') return copy.sort((a, b) => a.show.title.localeCompare(b.show.title))
  if (sort === 'rating') {
    // Rated shows first (highest to lowest), unrated last, ties by most recent.
    return copy.sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.addedAt - a.addedAt)
  }
  return copy.sort((a, b) => b.addedAt - a.addedAt)
}

export function averageRating(entries) {
  const rated = entries.filter((e) => e.rating)
  if (!rated.length) return null
  return Math.round((rated.reduce((sum, e) => sum + e.rating, 0) / rated.length) * 10) / 10
}

export function timeAgo(timestamp, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}
