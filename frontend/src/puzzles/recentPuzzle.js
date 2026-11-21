// The last puzzle opened in this browser, for "Weiterspielen" on the start
// page. Only id, type and name, in localStorage (mentioned on the privacy
// page). Storage can be unavailable (private mode, blocked site data), so
// every access is guarded and the start page works without it.

const KEY = 'lastPuzzle'

// The puzzle's translated names, so the start page shows the right one.
const namesOf = translations => {
  const names = {}
  for (const [locale, tr] of Object.entries(translations || {})) {
    if (tr && typeof tr.name === 'string') names[locale] = tr.name
  }
  return Object.keys(names).length ? names : undefined
}

export function rememberPuzzle (puzzle) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: puzzle.id, type: puzzle.type, name: puzzle.name, names: puzzle.names || namesOf(puzzle.translations) }))
  } catch {
    // ignore
  }
}

export function forgetPuzzle (id) {
  try {
    if (recentPuzzle()?.id === id) localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function recentPuzzle () {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null')
    return value && Number.isInteger(value.id) ? value : null
  } catch {
    return null
  }
}
