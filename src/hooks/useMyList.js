import { useEffect, useReducer, useRef, useState } from 'react'
import { STARTER_LIST } from '../data/shows.js'
import { supabase } from '../lib/supabase.js'
import { createRemote, diffStates, isEmptyDiff } from '../lib/listSync.js'

export const STORAGE_KEY = 'myflix:my-list'

// State: { [showId]: { addedAt, status, rating (0 = unrated), comments: [{ id, text, spoiler, createdAt, editedAt? }] } }
export function createInitialState(now = Date.now()) {
  return Object.fromEntries(
    // Stagger addedAt so "Recently added" has a stable order.
    STARTER_LIST.map((id, i) => [id, newEntry(now - i * 60_000)]),
  )
}

function newEntry(addedAt) {
  return { addedAt, status: 'want', rating: 0, comments: [] }
}

function updateEntry(state, id, fn) {
  if (!state[id]) return state
  return { ...state, [id]: fn(state[id]) }
}

export function listReducer(state, action) {
  switch (action.type) {
    case 'load':
      return action.state
    case 'add':
      if (state[action.id]) return state
      return { ...state, [action.id]: newEntry(action.now) }
    case 'remove': {
      const { [action.id]: _removed, ...rest } = state
      return rest
    }
    case 'rate':
      // Clicking the current rating again clears it.
      return updateEntry(state, action.id, (e) => ({ ...e, rating: e.rating === action.rating ? 0 : action.rating }))
    case 'setStatus':
      return updateEntry(state, action.id, (e) => ({ ...e, status: action.status }))
    case 'addComment':
      return updateEntry(state, action.id, (e) => ({
        ...e,
        comments: [
          { id: action.commentId, text: action.text, spoiler: action.spoiler, createdAt: action.now },
          ...e.comments,
        ],
      }))
    case 'editComment':
      return updateEntry(state, action.id, (e) => ({
        ...e,
        comments: e.comments.map((c) =>
          c.id === action.commentId ? { ...c, text: action.text, spoiler: action.spoiler, editedAt: action.now } : c,
        ),
      }))
    case 'deleteComment':
      return updateEntry(state, action.id, (e) => ({
        ...e,
        comments: e.comments.filter((c) => c.id !== action.commentId),
      }))
    default:
      return state
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // Corrupt or blocked storage — fall back to the starter list.
  }
  return createInitialState()
}

const defaultRemote = supabase ? createRemote(supabase) : null

// syncStatus: 'local' (no Supabase configured) | 'connecting' | 'synced' | 'error'
export function useMyList({ remote = defaultRemote } = {}) {
  const [list, dispatch] = useReducer(listReducer, undefined, loadState)
  const [syncStatus, setSyncStatus] = useState(remote ? 'connecting' : 'local')
  const sent = useRef(null) // last state handed to Supabase; null until the first load finishes
  const confirmed = useRef(null) // last state Supabase acknowledged
  const queue = useRef(Promise.resolve())

  // localStorage is always written, so the list also works offline.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    } catch {
      // Storage full or unavailable — the list still works for this session.
    }
  }, [list])

  // First load: cloud data wins; if the cloud is empty, the local list gets uploaded.
  useEffect(() => {
    if (!remote) return
    let cancelled = false
    remote
      .load()
      .then((remoteState) => {
        if (cancelled) return
        const hasRemote = Object.keys(remoteState).length > 0
        sent.current = confirmed.current = hasRemote ? remoteState : {}
        if (hasRemote) dispatch({ type: 'load', state: remoteState })
        setSyncStatus('synced')
      })
      .catch(() => !cancelled && setSyncStatus('error'))
    return () => {
      cancelled = true
    }
  }, [remote])

  // Every later change: send only the rows that differ, one batch at a time.
  useEffect(() => {
    if (!remote || sent.current === null) return
    const ops = diffStates(sent.current, list)
    if (isEmptyDiff(ops)) return
    sent.current = list
    queue.current = queue.current
      .then(() => remote.apply(ops))
      .then(
        () => {
          confirmed.current = list
          setSyncStatus('synced')
        },
        () => {
          sent.current = confirmed.current // resend what's missing on the next change
          setSyncStatus('error')
        },
      )
  }, [list, remote, syncStatus])

  const now = () => Date.now()
  return {
    list,
    syncStatus,
    add: (id) => dispatch({ type: 'add', id, now: now() }),
    remove: (id) => dispatch({ type: 'remove', id }),
    rate: (id, rating) => dispatch({ type: 'rate', id, rating }),
    setStatus: (id, status) => dispatch({ type: 'setStatus', id, status }),
    addComment: (id, text, spoiler) =>
      dispatch({ type: 'addComment', id, text, spoiler, commentId: crypto.randomUUID(), now: now() }),
    editComment: (id, commentId, text, spoiler) =>
      dispatch({ type: 'editComment', id, commentId, text, spoiler, now: now() }),
    deleteComment: (id, commentId) => dispatch({ type: 'deleteComment', id, commentId }),
  }
}
