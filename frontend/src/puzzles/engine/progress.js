// Saved games ("Spielstand") and personal best times.
//
// Every board keeps its unfinished game in localStorage under
// logivilia:<type>:<id> (a plain object with the board's own fields plus
// `elapsed`). This module adds `savedAt` and, for puzzles that PuzzlePage
// tracks, mirrors the game to the server for logged-in players
// (PUT/DELETE /api/puzzles/:id/progress), so it can be continued on another
// device. Writes to the server are batched: at most one every few seconds
// per puzzle, and whatever is pending goes out when the page is hidden.
//
// Best times of guests are kept in localStorage (logivilia:best:<id>);
// logged-in players get theirs from the server (PuzzleSolves.bestSeconds).

import { useMainStore } from '@/store/store'

const PUSH_DELAY = 4000
// fetch() with keepalive (needed while the page unloads) allows 64 KB.
const KEEPALIVE_LIMIT = 60000

const key = (type, id) => `logivilia:${type}:${id}`
const bestKey = id => `logivilia:best:${id}`

// ---------------------------------------------------------------------------
// localStorage (may be unavailable, e.g. in private mode)
// ---------------------------------------------------------------------------

/** The saved game of a puzzle, or null. The board checks that it still fits. */
export function readProgress (type, id) {
  try {
    const saved = JSON.parse(localStorage.getItem(key(type, id)) || 'null')
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : null
  } catch {
    return null
  }
}

function writeLocal (type, id, data) {
  try { localStorage.setItem(key(type, id), JSON.stringify(data)) } catch { /* storage unavailable */ }
}

/** Saves the game (locally, and on the server for a tracked puzzle). */
export function saveProgress (type, id, data) {
  const entry = { ...data, savedAt: Date.now() }
  writeLocal(type, id, entry)
  schedule(type, id, entry)
}

/** Forgets the game: the player restarted or solved the puzzle. */
export function clearProgress (type, id) {
  try { localStorage.removeItem(key(type, id)) } catch { /* ignore */ }
  schedule(type, id, null)
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const tracked = new Set()
const pending = new Map() // key -> { id, state | null, timer }
let queue = Promise.resolve()

const token = () => {
  const store = useMainStore()
  return store.isUserLoggedIn && store.token ? store.token : null
}

function send (id, state, { unloading = false } = {}) {
  const auth = token()
  if (!auth) return Promise.resolve()
  const body = state ? JSON.stringify({ state }) : undefined
  return fetch(`/api/puzzles/${id}/progress`, {
    method: state ? 'PUT' : 'DELETE',
    headers: { Authorization: `Bearer ${auth}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body,
    keepalive: unloading && (!body || body.length < KEEPALIVE_LIMIT)
  }).catch(() => { /* offline: the local copy is still there */ })
}

function schedule (type, id, state) {
  const k = key(type, id)
  if (!tracked.has(k) || !token()) return
  const entry = pending.get(k)
  if (entry) clearTimeout(entry.timer)
  // A delete goes out at once, so a slower pending save cannot outlive it.
  const delay = state ? PUSH_DELAY : 0
  pending.set(k, { id, state, timer: setTimeout(() => flush(k), delay) })
}

function flush (k, options) {
  const entry = pending.get(k)
  if (!entry) return
  clearTimeout(entry.timer)
  pending.delete(k)
  // One request after the other, so they arrive in order.
  if (options?.unloading) send(entry.id, entry.state, options)
  else queue = queue.then(() => send(entry.id, entry.state))
}

export function flushAll (options) {
  for (const k of [...pending.keys()]) flush(k, options)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flushAll({ unloading: true }))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll({ unloading: true })
  })
}

/**
 * Mirrors this puzzle's saved game to the server from now on (logged-in
 * players). `server` is GET /progress's `progress` ({ state, updatedAt } or
 * null): the newer of it and the local game wins; a newer local game (e.g.
 * played as a guest or offline) is sent to the server.
 */
export function trackProgress (type, id, server) {
  const k = key(type, id)
  tracked.add(k)
  if (!token()) return
  const local = readProgress(type, id)
  const remote = server?.state && typeof server.state === 'object' ? server.state : null
  const remoteTime = remote ? Number(remote.savedAt) || Date.parse(server.updatedAt) || 0 : -1
  const localTime = local ? Number(local.savedAt) || 0 : -1
  if (remote && remoteTime > localTime) writeLocal(type, id, remote)
  else if (local && localTime > remoteTime) schedule(type, id, local)
}

// ---------------------------------------------------------------------------
// Best times
// ---------------------------------------------------------------------------

export function localBest (id) {
  try {
    const value = Number(localStorage.getItem(bestKey(id)))
    return Number.isInteger(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

/** Records a guest's time; returns { bestSeconds, newBest }. */
export function recordLocalBest (id, seconds) {
  const previous = localBest(id)
  if (!Number.isInteger(seconds) || seconds <= 0) return { bestSeconds: previous, newBest: false }
  if (previous !== null && previous <= seconds) return { bestSeconds: previous, newBest: false }
  try { localStorage.setItem(bestKey(id), String(seconds)) } catch { /* ignore */ }
  return { bestSeconds: seconds, newBest: previous !== null }
}

/** 75 -> "01:15", 3725 -> "1:02:05" */
export function formatTime (seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = n => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
