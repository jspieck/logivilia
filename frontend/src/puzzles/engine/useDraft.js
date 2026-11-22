// Drafts of the puzzle editors.
//
// Logged-in creators: the draft lives on the server (PuzzleDrafts, listed in
// "Meine Rätsel"). The editor autosaves a moment after each change; the first
// save creates the draft and puts its ID into the URL (?draft=12), so a
// reload or a link from "Meine Rätsel" continues it. Publishing sends the
// draft's ID along and the server deletes the draft.
//
// Guests: one draft per type in localStorage, as before. A logged-in creator
// who still has such a local draft gets it uploaded once, then it is removed
// locally. If the server cannot be reached, the draft is kept locally too.
//
// Not used when editing an already published puzzle (`editId` set).
//
//   const draft = useDraft({ type, storageKey, content, isValid, editId })
//   const saved = await draft.load()   // the stored content or null
//   ...apply it to the editor...
//   draft.ready()                      // start watching for changes
//   draft.save()                       // call on every change (debounced)
//   PuzzleService.post({ ...puzzle, ...draft.publishFields() })
//   draft.published()

import { ref, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore } from '@/store/store'
import PuzzleService from '@/services/PuzzleService'

const SAVE_DELAY = 1500

/**
 * @param {object} options
 * @param {string} options.type - puzzle type
 * @param {string} options.storageKey - localStorage key for guests' drafts
 * @param {() => object} options.content - the editor's current draft content
 * @param {(content: any) => boolean} options.isValid - is stored content usable?
 * @param {import('vue').Ref<number|null>} options.editId - set when editing a puzzle
 */
export function useDraft ({ type, storageKey, content, isValid, editId }) {
  const route = useRoute()
  const router = useRouter()
  const store = useMainStore()
  const editorPath = route.path

  const draftId = ref(null)
  // '' (nothing to say), 'saving', 'saved', 'local' (only in this browser),
  // 'error' (not saved; kept locally)
  const status = ref('')
  const loadError = ref('')

  let started = false
  let lastSaved = null
  let timer = null
  let inFlight = null

  const loggedIn = () => store.isUserLoggedIn && !!store.user
  const serialize = () => JSON.stringify(content())

  function readLocal () {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      return saved && isValid(saved) ? saved : null
    } catch {
      return null
    }
  }
  function writeLocal (value) {
    try { localStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* storage unavailable */ }
  }
  function removeLocal () {
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
  }

  /** The stored draft content (server draft from ?draft=, else local), or null. */
  async function load () {
    if (editId.value) return null
    const id = Number(route.query.draft)
    if (Number.isInteger(id) && id > 0 && loggedIn()) {
      try {
        const { data } = await PuzzleService.draft(id)
        if (data.type === type && isValid(data.state)) {
          draftId.value = data.id
          lastSaved = JSON.stringify(data.state)
          return data.state
        }
      } catch { /* deleted or not ours: start from the local draft or empty */ }
      loadError.value = 'notFound'
      router.replace({ query: { ...route.query, draft: undefined } })
    }
    return readLocal()
  }

  /** The editor has applied the loaded content; changes are saved from now on. */
  function ready () {
    started = true
    if (lastSaved === null) {
      lastSaved = loggedIn() && readLocal() ? null : serialize()
      // A local draft of a logged-in creator moves to the server.
      if (lastSaved === null) save()
    }
  }

  async function saveNow () {
    timer = null
    const value = content()
    const json = JSON.stringify(value)
    if (json === lastSaved) return
    if (!loggedIn()) {
      writeLocal(value)
      lastSaved = json
      status.value = 'local'
      return
    }
    status.value = 'saving'
    const body = { type, name: value.name || '', state: value }
    try {
      if (draftId.value) {
        await PuzzleService.updateDraft(draftId.value, body)
      } else {
        const { data } = await PuzzleService.createDraft(body)
        draftId.value = data.id
        // Not when this was the last save on the way out to another page.
        if (router.currentRoute.value.path === editorPath) {
          router.replace({ query: { ...route.query, draft: String(data.id) } })
        }
      }
      lastSaved = json
      status.value = 'saved'
      removeLocal()
    } catch {
      // Keep the work in this browser, try the server again on the next change.
      writeLocal(value)
      status.value = 'error'
    }
  }

  /** Call after every change; saves a moment later. */
  function save () {
    if (!started || editId.value) return
    clearTimeout(timer)
    timer = setTimeout(() => { inFlight = saveNow().finally(() => { inFlight = null }) }, SAVE_DELAY)
  }

  /** Extra fields for POST /puzzles, so the server deletes the draft. */
  function publishFields () {
    return draftId.value ? { draftId: draftId.value } : {}
  }

  /** The puzzle was published from this draft. */
  async function published () {
    clearTimeout(timer)
    timer = null
    if (inFlight) await inFlight.catch(() => {})
    started = false
    removeLocal()
    draftId.value = null
  }

  // Leaving the editor: save what is pending right away.
  onBeforeUnmount(() => {
    if (timer) {
      clearTimeout(timer)
      saveNow()
    }
  })

  return { draftId, status, loadError, load, ready, save, publishFields, published }
}
