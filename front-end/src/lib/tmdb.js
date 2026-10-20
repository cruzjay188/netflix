// Real TV shows from TMDB, through the `tmdb` Edge Function (supabase/functions/tmdb/).
// The function holds the TMDB key; the browser never sees it. supabase.functions.invoke
// sends the logged-in user's token, and the function refuses calls without one.
//
// Each result: { id, name, overview, first_air_date, year, genre, poster_url, backdrop_url }

import { supabase } from './supabase.js'

export function createTmdb(client) {
  async function call(path, query) {
    const params = new URLSearchParams({ path })
    if (query) params.set('query', query)
    const { data, error } = await client.functions.invoke(`tmdb?${params}`, { method: 'GET' })
    if (error) throw error
    return data.results
  }

  return {
    trending: () => call('/trending/tv/week'),
    search: (query) => call('/search/tv', query),
  }
}

// null without Supabase (device-only mode and tests): the TMDB section is then hidden.
export const tmdb = supabase ? createTmdb(supabase) : null
