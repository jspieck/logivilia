// One page of an overview table, fetched from the server
// (GET /puzzles?page=...): filtering, sorting and pagination happen in SQL,
// so the page never loads every puzzle of a type. Each row carries its
// average rating and, for a logged-in player, `solved`.
//
// `query` is a computed/ref with the request parameters (page, perPage,
// sort, order, q, filters). The list reloads whenever it changes, when the
// player logs in or out, and when a cached (<keep-alive>) overview is shown
// again, so a puzzle solved meanwhile shows up as solved.

import { ref, watch, onActivated } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store/store'
import PuzzleService from '@/services/PuzzleService'

export function usePuzzleList (type, query) {
  const { isUserLoggedIn } = storeToRefs(useMainStore())

  const rows = ref([])
  const total = ref(0)
  const loading = ref(true)
  const failed = ref(false)
  let latest = 0

  const load = async () => {
    const request = ++latest
    loading.value = true
    try {
      const { data } = await PuzzleService.list({ type, ...query.value })
      // A slower, older request must not overwrite a newer answer.
      if (request !== latest) return
      rows.value = data.items
      total.value = data.total
      failed.value = false
    } catch (error) {
      if (request !== latest) return
      console.error(`Error loading ${type} puzzles:`, error)
      failed.value = true
    } finally {
      if (request === latest) loading.value = false
    }
  }

  watch(query, load, { deep: true, immediate: true })
  watch(isUserLoggedIn, load)
  let firstActivation = true
  onActivated(() => {
    if (firstActivation) {
      firstActivation = false
      return
    }
    load()
  })

  return { rows, total, loading, failed, reload: load }
}
