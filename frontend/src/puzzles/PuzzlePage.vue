<template>
  <div class="puzzle-container">
    <div v-if="loadError" class="notification is-danger">{{ loadError }}</div>

    <template v-else-if="puzzle">
      <div v-if="puzzleType.showHeader" class="puzzle-header">
        <h1 class="puzzle-title">{{ puzzle.name }}</h1>
        <DifficultyIndicator :difficulty="puzzle.difficulty" :maxDifficulty="5" />
      </div>

      <div class="puzzle-body">
        <component
          :is="puzzleType.component"
          :key="puzzle.id"
          :puzzle="puzzle"
          :submit="submit"
          @solved="solvedNow = true"
        />

        <div class="rating-section">
          <h3>Bewertung</h3>
          <StarRating v-if="store.isUserLoggedIn" :model-value="rating" :max="5" @update:model-value="saveRating" />
          <p v-else class="login-message">Bitte loggen Sie sich ein, um das Rätsel zu bewerten.</p>
        </div>

        <div v-if="solvedNow || alreadySolved" class="status-section">
          <div v-if="solvedNow" class="success-message">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            Gratulation! Sie haben dieses Rätsel gelöst!
          </div>
          <div v-else class="already-solved">
            Sie haben dieses Rätsel bereits gelöst.
          </div>
        </div>
      </div>

      <CommentSystem :puzzleId="puzzle.id" />
    </template>
  </div>
</template>

<script setup>
// One page for every puzzle type: loads the puzzle, renders the type's board
// (see ./index.js), and handles what all types share: recording the solve,
// rating, "already solved" and comments.

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useOruga } from '@oruga-ui/oruga-next'
import { useMainStore } from '@/store/store'
import { apiErrorMessage } from '@/i18n'
import PuzzleService from '@/services/PuzzleService'
import UserService from '@/services/UserService'
import CommentSystem from '@/components/CommentSystem.vue'
import DifficultyIndicator from '@/components/DifficultyIndicator.vue'
import StarRating from '@/components/StarRating.vue'
import { getPuzzleType } from './index'

const route = useRoute()
const store = useMainStore()
const oruga = useOruga()

const puzzle = ref(null)
const loadError = ref('')
const rating = ref(null)
const alreadySolved = ref(false)
const solvedNow = ref(false)

const puzzleType = computed(() => getPuzzleType(puzzle.value.type))

const notify = (message, variant = 'success') =>
  oruga.notification.open({ message, duration: 3000, variant, position: 'top-right' })

const loadUserState = async () => {
  if (!puzzle.value || !store.isUserLoggedIn || !store.user) {
    rating.value = null
    alreadySolved.value = false
    return
  }
  const id = puzzle.value.id
  try {
    const [ratingRes, solvedRes] = await Promise.all([
      PuzzleService.myRating(id),
      UserService.solved(store.user.id, puzzle.value.type)
    ])
    rating.value = ratingRes.data.rating
    alreadySolved.value = solvedRes.data.includes(id)
  } catch (error) {
    console.error('Error loading rating or solved state:', error)
  }
}

const load = async (id) => {
  puzzle.value = null
  loadError.value = ''
  solvedNow.value = false
  try {
    puzzle.value = (await PuzzleService.show(id)).data
  } catch (error) {
    loadError.value = apiErrorMessage(error)
    return
  }
  await loadUserState()
}

// Passed to the board. Logged-in players record the solve (the server checks
// the answer first); guests and players who solved it before only ask whether
// the answer is correct.
let inFlight = false
const submit = async (answer) => {
  if (inFlight) return false
  inFlight = true
  const id = puzzle.value.id
  try {
    if (store.isUserLoggedIn && !alreadySolved.value) {
      try {
        await PuzzleService.solve(id, answer)
      } catch (error) {
        if (error.response?.data?.code === 'SOLUTION_INCORRECT') return false
        throw error
      }
      alreadySolved.value = true
      notify('Rätsel erfolgreich als gelöst markiert!')
      return true
    }
    return (await PuzzleService.check(id, answer)).data.solved === true
  } catch (error) {
    console.error('Error checking solution:', error)
    notify(apiErrorMessage(error), 'danger')
    return false
  } finally {
    inFlight = false
  }
}

const saveRating = async (value) => {
  const previous = rating.value
  rating.value = value
  try {
    await PuzzleService.rate(puzzle.value.id, value)
    notify('Bewertung gespeichert')
  } catch (error) {
    rating.value = previous
    notify(apiErrorMessage(error), 'danger')
  }
}

watch(() => route.params.id, id => { if (id) load(id) })
watch(() => store.isUserLoggedIn, loadUserState)

onMounted(() => {
  load(route.params.id)
  window.ondragstart = () => false
  window.onbeforeunload = () => 'Möchten Sie die Seite wirklich verlassen? Nicht gespeicherte Rätsel sind für immer verloren!'
})

onBeforeUnmount(() => {
  window.ondragstart = null
  window.onbeforeunload = null
})
</script>

<style lang="scss" scoped>
.puzzle-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.puzzle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .puzzle-title {
    font-size: 24px;
    margin: 0;
  }
}

.puzzle-body {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.rating-section {
  margin: 20px 0;
  padding-top: 20px;
  border-top: 1px solid #eee;

  h3 {
    font-size: 20px;
    margin-bottom: 15px;
  }

  .login-message {
    color: #666;
  }
}

.status-section {
  margin: 20px 0;

  .success-message {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #2e7d32;
  }

  .already-solved {
    color: #666;
    font-style: italic;
  }
}

@media (max-width: 768px) {
  .puzzle-container {
    padding: 10px;
  }

  .puzzle-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
