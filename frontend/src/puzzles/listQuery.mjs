// Overview filters and sorting as URL query parameters, shared by the
// overview pages (components/PuzzleOverview.vue) and the puzzle page.
//
// The overview keeps its state in the URL (?difficulty=3&sort=avgRating&
// order=desc&page=2), so a filtered list can be bookmarked and shared, and
// Back returns to it. Links from the list to a puzzle carry the same
// parameters (without the page), so "next puzzle" continues in that list
// (GET /puzzles/:id/next takes the same filters as the list).
//
// Values that do not fit are dropped, so an old or edited link never breaks
// a page.

/** Larger side of the grid. */
export const SIZES = [
  { value: '1-10', label: '≤ 10' },
  { value: '11-15', label: '11–15' },
  { value: '16-20', label: '16–20' },
  { value: '21-30', label: '21–30' },
  { value: '31-', label: '> 30' }
]
export const COLORS = [1, 2, 3, 4]
export const DIFFICULTIES = [1, 2, 3, 4, 5]
export const RATINGS = [2, 3, 4]
const SORT_FIELDS = ['name', 'difficulty', 'width', 'height', 'numColor', 'avgRating', 'date', 'solved']

/** Filter fields of the overview ('' / false = not set). */
export const emptyFilters = () => ({ size: '', colors: '', difficulty: '', rating: '', author: '', unsolved: false })

const first = value => (Array.isArray(value) ? value[0] : value)
const text = value => {
  const v = first(value)
  return typeof v === 'string' ? v.trim().slice(0, 100) : ''
}
const oneOf = (value, allowed) => {
  const n = Number(first(value))
  return allowed.includes(n) ? n : ''
}

/**
 * Overview state from a route query:
 * { q, filters: emptyFilters(), sort: { field, order }, page }.
 * `search` (the home page's link) is read as `q`.
 */
export function readListQuery (query = {}) {
  const size = text(query.size)
  const sortField = text(query.sort)
  const page = Number(first(query.page))
  return {
    q: text(query.q) || text(query.search),
    filters: {
      size: SIZES.some(s => s.value === size) ? size : '',
      colors: oneOf(query.colors, COLORS),
      difficulty: oneOf(query.difficulty, DIFFICULTIES),
      rating: oneOf(query.rating, RATINGS),
      author: text(query.author),
      unsolved: first(query.unsolved) === '1'
    },
    sort: {
      field: SORT_FIELDS.includes(sortField) ? sortField : null,
      order: first(query.order) === 'desc' ? 'desc' : 'asc'
    },
    page: Number.isInteger(page) && page > 1 ? page : 1
  }
}

/**
 * Route query for an overview state: only what differs from the defaults,
 * as strings. Without `page` (e.g. for links to a puzzle) the page is left out.
 */
export function toRouteQuery ({ q, filters, sort, page }, { withPage = true } = {}) {
  const query = {}
  if (q) query.q = q
  for (const key of ['size', 'colors', 'difficulty', 'rating', 'author']) {
    if (filters[key] !== '' && filters[key] != null) query[key] = String(filters[key])
  }
  if (filters.unsolved) query.unsolved = '1'
  if (sort.field) {
    query.sort = sort.field
    if (sort.order === 'desc') query.order = 'desc'
  }
  if (withPage && page > 1) query.page = String(page)
  return query
}

/** The list context to carry from the overview to puzzle links (no page). */
export const listContext = routeQuery => toRouteQuery(readListQuery(routeQuery), { withPage: false })

/**
 * Filter and sort parameters for the API (GET /puzzles?page=... and
 * GET /puzzles/:id/next). "Unsolved only" counts only for logged-in players.
 */
export function toApiParams ({ q, filters, sort }, loggedIn) {
  const [minSize, maxSize] = filters.size ? filters.size.split('-') : []
  const colors = filters.colors === '' ? null : Number(filters.colors)
  const difficulty = filters.difficulty === '' ? null : Number(filters.difficulty)
  return {
    q,
    author: filters.author,
    minSize: minSize || null,
    maxSize: maxSize || null,
    minColors: colors,
    maxColors: colors !== null && colors < 4 ? colors : null,
    minDifficulty: difficulty,
    maxDifficulty: difficulty,
    minRating: filters.rating || null,
    status: filters.unsolved && loggedIn ? 'unsolved' : null,
    sort: sort.field,
    order: sort.order
  }
}

/** True if two route queries hold the same parameters. */
export function sameQuery (a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every(k => String(first(a[k]) ?? '') === String(first(b[k]) ?? ''))
}
