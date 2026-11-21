<template>
  <div class="puzzle-container">
    <div v-if="loadError" class="notification is-danger">{{ loadError }}</div>

    <template v-else-if="puzzle">
      <div v-if="puzzleType.showHeader" class="puzzle-header">
        <h1 class="puzzle-title">{{ puzzleName(puzzle) }}</h1>
        <DifficultyIndicator :difficulty="puzzle.difficulty" :maxDifficulty="5" />
      </div>

      <div class="puzzle-body">
        <component
          :is="puzzleType.component"
          :key="puzzle.id"
          :puzzle="puzzle"
          :submit="submit"
          :offline-result="offlineResult"
          @solved="solvedNow = true"
        />

        <component :is="puzzleType.adminPanel" v-if="puzzleType.adminPanel && canSeeSource" :puzzle-id="puzzle.id" />

        <div class="rating-section">
          <h3>{{ t('overview.rating') }}</h3>
          <StarRating v-if="store.isUserLoggedIn" :model-value="rating" :max="5" @update:model-value="saveRating" />
          <p v-else class="login-message">{{ t('puzzle.loginToRate') }}</p>
        </div>

        <div v-if="solvedNow || alreadySolved || bestSeconds" class="status-section">
          <div v-if="solvedNow" class="success-message">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            {{ t('puzzle.solvedNow') }}
          </div>
          <div v-else-if="alreadySolved" class="already-solved">
            {{ t('puzzle.alreadySolved') }}
          </div>
          <div v-if="bestSeconds" class="best-time">
            <ion-icon name="trophy-outline"></ion-icon>
            {{ t('puzzle.bestTime', { time: formatTime(bestSeconds) }) }}
            <strong v-if="newBest" class="new-best">{{ t('puzzle.newBest') }}</strong>
          </div>
          <div v-if="solvedNow || alreadySolved" class="next-puzzle">
            <router-link v-if="nextId" :to="{ path: `/puzzle/${nextId}`, query: listQuery }" class="button is-primary">
              {{ store.isUserLoggedIn ? t('puzzle.nextUnsolved') : t('puzzle.nextPuzzle') }}
              <ion-icon name="arrow-forward-outline"></ion-icon>
            </router-link>
            <p v-else-if="nextId === null && store.isUserLoggedIn" class="all-solved">{{ t('puzzle.allSolved') }}</p>
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
// rating, "already solved", saved games on the server, best times and
// comments.

import { ref, computed, watch, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePuzzleName } from './puzzleName'
import { useOruga } from '@oruga-ui/oruga-next'
import { useMainStore } from '@/store/store'
import { apiErrorMessage } from '@/i18n'
import PuzzleService from '@/services/PuzzleService'
import UserService from '@/services/UserService'
import CommentSystem from '@/components/CommentSystem.vue'
import DifficultyIndicator from '@/components/DifficultyIndicator.vue'
import StarRating from '@/components/StarRating.vue'
import { getPuzzleType } from './index'
import { readListQuery, listContext, toApiParams } from './listQuery'
import { rememberPuzzle, forgetPuzzle } from './recentPuzzle'
import { trackProgress, flushAll, localBest, recordLocalBest, formatTime } from './engine/progress'
import { queueSolve, isOfflineError, onSolveSynced } from './engine/pendingSolves'

const { t } = useI18n()
const puzzleName = usePuzzleName()
const route = useRoute()
const store = useMainStore()
const oruga = useOruga()

const puzzle = ref(null)
const loadError = ref('')
const rating = ref(null)
const alreadySolved = ref(false)
const solvedNow = ref(false)
// Personal best time in seconds (server for logged-in players, else local).
const bestSeconds = ref(null)
const newBest = ref(false)
// Set when a solve sent offline for this puzzle got its answer from the
// server: { solved }. The board then finishes (or says it was wrong).
const offlineResult = ref(null)
// The next puzzle of this type the player has not solved, shown once this
// one is solved: an ID, null (none left) or undefined (not known yet).
const nextId = ref(undefined)
// Filters and sort of the overview the player came from (in the URL), so
// "next puzzle" continues in that list; empty: ID order.
const listQuery = computed(() => listContext(route.query))

const puzzleType = computed(() => getPuzzleType(puzzle.value.type))
// Admins and the author may see the stored data (e.g. a logic puzzle's rules).
const canSeeSource = computed(() => !!store.user &&
  (store.user.role === 'Admin' || (puzzle.value.UserId != null && puzzle.value.UserId === store.user.id)))

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

// Logged-in players: the saved game and best time from the server. A failure
// only means playing on with the local copy.
const loadProgress = async (id) => {
  if (!store.isUserLoggedIn) return { progress: null, bestSeconds: localBest(id) }
  try {
    return (await PuzzleService.progress(id)).data
  } catch (error) {
    console.error('Error loading saved game:', error)
    return { progress: null, bestSeconds: null }
  }
}

const load = async (id) => {
  flushAll()
  puzzle.value = null
  loadError.value = ''
  solvedNow.value = false
  newBest.value = false
  offlineResult.value = null
  nextId.value = undefined
  let loaded
  let progress
  try {
    [loaded, progress] = await Promise.all([PuzzleService.show(id), loadProgress(id)])
  } catch (error) {
    loadError.value = apiErrorMessage(error)
    return
  }
  // Before the board is shown, so it starts from the newer saved game.
  trackProgress(loaded.data.type, loaded.data.id, progress.progress)
  bestSeconds.value = progress.bestSeconds
  puzzle.value = loaded.data
  rememberPuzzle(puzzle.value)
  await loadUserState()
}

// Passed to the board: submit(answer, { seconds, verified }). Logged-in
// players record the solve and time (the server checks the answer first;
// solving again may set a new best time); guests only ask whether the answer
// is correct and keep their best time locally. `verified`: the board already
// knows the answer is right (nonogram: the clues prove it).
//
// Returns true (solved), false (wrong) or 'offline': no connection, the
// answer is kept and checked when the connection is back (see
// engine/pendingSolves.js; the board hears the outcome via offlineResult).
// A verified solve counts as solved right away, offline too.
let inFlight = false
const submit = async (answer, { seconds, verified = false } = {}) => {
  if (inFlight) return false
  inFlight = true
  const id = puzzle.value.id
  try {
    return await send(id, answer, seconds)
  } catch (error) {
    if (!isOfflineError(error)) throw error
    return keepForLater(id, answer, seconds, verified)
  } finally {
    inFlight = false
  }
}

function keepForLater (id, answer, seconds, verified) {
  const userId = store.isUserLoggedIn ? store.user?.id ?? null : null
  if (verified && userId === null) {
    // A guest's verified solve needs no server at all.
    forgetPuzzle(id)
    const best = recordLocalBest(id, seconds)
    bestSeconds.value = best.bestSeconds
    newBest.value = best.newBest
    return true
  }
  queueSolve({ id, name: puzzle.value.name, answer, seconds, userId })
  // An unverified answer: the board itself says it is checked later.
  if (verified) notify(t('puzzle.offlineSaved'), 'info')
  return verified ? true : 'offline'
}

async function send (id, answer, seconds) {
  try {
    if (store.isUserLoggedIn) {
      let result
      try {
        result = (await PuzzleService.solve(id, answer, seconds)).data
      } catch (error) {
        if (error.response?.data?.code === 'SOLUTION_INCORRECT') return false
        throw error
      }
      if (!alreadySolved.value) notify(t('puzzle.markedSolved'))
      alreadySolved.value = true
      bestSeconds.value = result.bestSeconds ?? null
      newBest.value = result.newBest === true
      forgetPuzzle(id)
      return true
    }
    const solved = (await PuzzleService.check(id, answer)).data.solved === true
    if (solved) {
      forgetPuzzle(id)
      const best = recordLocalBest(id, seconds)
      bestSeconds.value = best.bestSeconds
      newBest.value = best.newBest
    }
    return solved
  } catch (error) {
    if (isOfflineError(error)) throw error
    console.error('Error checking solution:', error)
    notify(apiErrorMessage(error), 'danger')
    return false
  }
}

// A solve of this puzzle, kept while offline, reached the server.
const stopSyncListener = onSolveSynced(({ entry, solved, result }) => {
  if (!puzzle.value || entry.id !== puzzle.value.id) return
  if (solved) {
    if (entry.userId !== null) alreadySolved.value = true
    bestSeconds.value = result?.bestSeconds ?? bestSeconds.value
    newBest.value = result?.newBest === true
  }
  offlineResult.value = { solved }
})

const saveRating = async (value) => {
  const previous = rating.value
  rating.value = value
  try {
    await PuzzleService.rate(puzzle.value.id, value)
    notify(t('puzzle.ratingSaved'))
  } catch (error) {
    rating.value = previous
    notify(apiErrorMessage(error), 'danger')
  }
}

watch(() => route.params.id, id => { if (id) load(id) })
watch(() => store.isUserLoggedIn, loadUserState)

// Asked only after solving (the server then already counts this one as
// solved). Offline, the button just stays away.
const loadNext = async () => {
  if (!puzzle.value || nextId.value !== undefined) return
  const id = puzzle.value.id
  try {
    const { data } = await PuzzleService.next(id, toApiParams(readListQuery(route.query), store.isUserLoggedIn))
    if (puzzle.value && puzzle.value.id === id) nextId.value = data.id
  } catch (error) {
    console.error('Error loading the next puzzle:', error)
  }
}
watch([solvedNow, alreadySolved], ([now, before]) => { if (now || before) loadNext() })

onMounted(() => {
  load(route.params.id)
  window.ondragstart = () => false
})

onBeforeUnmount(() => {
  window.ondragstart = null
  stopSyncListener()
})
// After the board's own last save (children unmount first).
onUnmounted(() => flushAll())
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

  .next-puzzle {
    margin-top: 14px;

    .button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .all-solved {
      color: #2e7d32;
    }
  }

  .best-time {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    color: #374151;
    font-variant-numeric: tabular-nums;
  }

  .new-best {
    color: #b45309;
  }
}

@media (max-width: 768px) {
  .puzzle-container {
    padding: 8px 0;
  }

  .puzzle-body {
    padding: 14px 10px;
    border-radius: 6px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  }

  .puzzle-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
