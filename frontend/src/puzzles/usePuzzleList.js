// Puzzles of one type for an overview page, with average rating
// (`avgRating`, from the list endpoint) and the logged-in player's solves.

import { ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store/store'
import PuzzleService from '@/services/PuzzleService'
import UserService from '@/services/UserService'

export function usePuzzleList (type) {
  const store = useMainStore()
  const { isUserLoggedIn, user } = storeToRefs(store)

  const puzzles = ref([])
  const solved = ref(new Set())
  const loading = ref(true)

  const loadSolved = async () => {
    solved.value = isUserLoggedIn.value && user.value
      ? new Set((await UserService.solved(user.value.id, type)).data)
      : new Set()
  }

  const load = async () => {
    loading.value = true
    try {
      puzzles.value = (await PuzzleService.index(type)).data
      await loadSolved()
    } catch (error) {
      console.error(`Error loading ${type} puzzles:`, error)
    } finally {
      loading.value = false
    }
  }

  watch(isUserLoggedIn, loadSolved)
  onMounted(load)

  return {
    puzzles,
    loading,
    isSolved: id => solved.value.has(id),
    reload: load
  }
}
