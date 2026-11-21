// Solves made offline, sent when the connection is back.
//
// The server needs only the answer and the time the board measured, so a
// solve can be recorded later just as well. Each entry is kept in
// localStorage until the server has answered it (correct or not); a network
// error keeps it for the next try. Logged-in entries carry the user id and
// are only sent while that user is logged in; guest entries only ask whether
// the answer is right (for the local best time).
//
// flushPendingSolves() runs on app start, when the browser goes online and
// after login (App.vue). Listeners (onSolveSynced) hear every result, so the
// puzzle page can finish a board that is still open.

import PuzzleService from '@/services/PuzzleService'
import { recordLocalBest } from './progress'
import { forgetPuzzle } from '../recentPuzzle'

const KEY = 'logivilia.pendingSolves'
const listeners = new Set()
let flushing = null

function read () {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write (list) {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list))
    else localStorage.removeItem(KEY)
  } catch { /* storage blocked: the solve is lost, as before */ }
}

/** True when a request failed for lack of a connection (no server answer). */
export function isOfflineError (error) {
  return !error?.response && (error?.code === 'ERR_NETWORK' || navigator.onLine === false)
}

/**
 * Keeps a solve for later. One entry per puzzle and user; a newer one
 * replaces the older (it has the newer answer and time).
 * @param {{ id: number, name?: string, answer: any, seconds?: number, userId: number|null }} entry
 */
export function queueSolve (entry) {
  const list = read().filter(e => !(e.id === entry.id && e.userId === entry.userId))
  list.push({ ...entry, queuedAt: Date.now() })
  write(list)
}

export function hasPendingSolve (id, userId) {
  return read().some(e => e.id === id && e.userId === userId)
}

/** fn({ entry, solved, result }) after the server answered an entry. */
export function onSolveSynced (fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Sends what can be sent now; userId is the logged-in user (or null). */
export function flushPendingSolves (userId) {
  if (!flushing) flushing = flush(userId).finally(() => { flushing = null })
  return flushing
}

async function flush (userId) {
  for (const entry of read()) {
    // Another user's solve waits until they log in again.
    if (entry.userId !== null && entry.userId !== userId) continue
    let solved
    let result = null
    try {
      if (entry.userId !== null) {
        result = (await PuzzleService.solve(entry.id, entry.answer, entry.seconds)).data
        solved = true
      } else {
        solved = (await PuzzleService.check(entry.id, entry.answer)).data.solved === true
        if (solved) result = recordLocalBest(entry.id, entry.seconds)
      }
    } catch (error) {
      if (error.response?.data?.code === 'SOLUTION_INCORRECT') {
        solved = false
      } else if (error.response?.status === 404) {
        // Puzzle deleted in the meantime: nothing to record.
        remove(entry)
        continue
      } else {
        // Offline again, logged out (401) or a server error: try later.
        if (isOfflineError(error)) break
        continue
      }
    }
    remove(entry)
    if (solved) forgetPuzzle(entry.id)
    listeners.forEach(fn => fn({ entry, solved, result }))
  }
}

function remove (entry) {
  write(read().filter(e => !(e.id === entry.id && e.userId === entry.userId)))
}
