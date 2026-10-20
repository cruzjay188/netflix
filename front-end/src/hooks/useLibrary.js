import { useEffect, useReducer, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { createLibraryRemote, diffLibrary } from '../lib/librarySync.js'
import { isEmptyDiff } from '../lib/listSync.js'
import { enqueue } from '../lib/session.js'
import { userStorageKey } from '../utils/authUtils.js'
import { isListNameTaken } from '../utils/libraryUtils.js'

export const LIBRARY_KEY = 'myflix:library'

// State: {
//   customShows: { [showId]: { id, title, kind, year, seasons (null for movies), genre, maturity, synopsis, createdAt,
//                              tmdbId?, posterUrl? (titles added from TMDB) } },
//   lists: { [listId]: { name, createdAt, items: { [showId]: addedAt } } },
// }
export const EMPTY_LIBRARY = { customShows: {}, lists: {} }

function updateList(state, listId, fn) {
  const list = state.lists[listId]
  if (!list) return state
  const next = fn(list)
  return next === list ? state : { ...state, lists: { ...state.lists, [listId]: next } }
}

function withoutKey(object, key) {
  const { [key]: _removed, ...rest } = object
  return rest
}

export function libraryReducer(state, action) {
  switch (action.type) {
    case 'load':
      return action.state
    case 'addShow':
      return { ...state, customShows: { ...state.customShows, [action.show.id]: action.show } }
    case 'deleteShow': {
      if (!state.customShows[action.id]) return state
      // Also take the show out of every list that has it.
      const lists = Object.fromEntries(
        Object.entries(state.lists).map(([id, list]) =>
          action.id in list.items ? [id, { ...list, items: withoutKey(list.items, action.id) }] : [id, list],
        ),
      )
      return { customShows: withoutKey(state.customShows, action.id), lists }
    }
    case 'createList':
      if (isListNameTaken(state.lists, action.name)) return state
      return { ...state, lists: { ...state.lists, [action.listId]: { name: action.name, createdAt: action.now, items: {} } } }
    case 'renameList':
      if (isListNameTaken(state.lists, action.name, action.listId)) return state
      return updateList(state, action.listId, (list) => (list.name === action.name ? list : { ...list, name: action.name }))
    case 'deleteList':
      if (!state.lists[action.listId]) return state
      return { ...state, lists: withoutKey(state.lists, action.listId) }
    case 'addToList':
      return updateList(state, action.listId, (list) =>
        action.showId in list.items ? list : { ...list, items: { ...list.items, [action.showId]: action.now } },
      )
    case 'removeFromList':
      return updateList(state, action.listId, (list) =>
        action.showId in list.items ? { ...list, items: withoutKey(list.items, action.showId) } : list,
      )
    default:
      return state
  }
}

function loadLibrary(key) {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved)
  } catch {
    // Corrupt or blocked storage — start empty.
  }
  return EMPTY_LIBRARY
}

const defaultRemote = supabase ? createLibraryRemote(supabase) : null

// Same persistence model as useMyList: localStorage always, Supabase when configured.
// syncStatus: 'local' | 'connecting' | 'synced' | 'error'
// userId: the logged-in account, so its offline copy is kept apart from anyone else's.
export function useLibrary({ remote = defaultRemote, userId = null } = {}) {
  const storageKey = userStorageKey(LIBRARY_KEY, userId)
  const [library, dispatch] = useReducer(libraryReducer, storageKey, loadLibrary)
  const [syncStatus, setSyncStatus] = useState(remote ? 'connecting' : 'local')
  const sent = useRef(null) // last state handed to Supabase; null until the first load finishes
  const confirmed = useRef(null) // last state Supabase acknowledged

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(library))
    } catch {
      // Storage full or unavailable — the library still works for this session.
    }
  }, [library, storageKey])

  // First load: cloud data wins; if the cloud is empty, the local library gets uploaded.
  useEffect(() => {
    if (!remote) return
    let cancelled = false
    remote
      .load()
      .then((remoteState) => {
        if (cancelled) return
        const hasRemote = Object.keys(remoteState.customShows).length > 0 || Object.keys(remoteState.lists).length > 0
        sent.current = confirmed.current = hasRemote ? remoteState : EMPTY_LIBRARY
        if (hasRemote) dispatch({ type: 'load', state: remoteState })
        setSyncStatus('synced')
      })
      .catch(() => !cancelled && setSyncStatus('error'))
    return () => {
      cancelled = true
    }
  }, [remote])

  // Every later change: send only the rows that differ, through the shared write queue.
  useEffect(() => {
    if (!remote || sent.current === null) return
    const ops = diffLibrary(sent.current, library)
    if (isEmptyDiff(ops)) return
    sent.current = library
    enqueue(() => remote.apply(ops)).then(
      () => {
        confirmed.current = library
        setSyncStatus('synced')
      },
      () => {
        sent.current = confirmed.current // resend what's missing on the next change
        setSyncStatus('error')
      },
    )
  }, [library, remote, syncStatus])

  const now = () => Date.now()
  return {
    library,
    syncStatus,
    // Returns the new show's id so the caller can also add it to My List.
    addShow: (fields) => {
      const show = { ...fields, id: `u-${crypto.randomUUID()}`, createdAt: now() }
      dispatch({ type: 'addShow', show })
      return show.id
    },
    deleteShow: (id) => dispatch({ type: 'deleteShow', id }),
    // Returns the new list's id (callers check the name with isListNameTaken first).
    createList: (name) => {
      const listId = crypto.randomUUID()
      dispatch({ type: 'createList', listId, name, now: now() })
      return listId
    },
    renameList: (listId, name) => dispatch({ type: 'renameList', listId, name }),
    deleteList: (listId) => dispatch({ type: 'deleteList', listId }),
    addToList: (listId, showId) => dispatch({ type: 'addToList', listId, showId, now: now() }),
    removeFromList: (listId, showId) => dispatch({ type: 'removeFromList', listId, showId }),
  }
}
