<template>
  <div class="board">
    <p v-if="restored && !solved" class="board-message">{{ t('common.restored') }}</p>
    <LogicalDisplay
      ref="display"
      :logical="puzzle"
      :is-preview="false"
      :solved="solved"
      :elapsed="elapsed"
      @solution-check="check"
      @progress="onProgress"
    />
    <div class="check-solution">
      <button class="button is-primary" :disabled="checking || solved" @click="display.checkSolution()">{{ t('logical.check') }}</button>
      <img v-if="solved" class="success-icon" src="@/assets/haken.png" width="40" height="40" alt="" />
      <h4 class="solution-message">{{ message }}</h4>
    </div>
    <p v-if="solved" class="solved-time">{{ t('nonogram.solvedIn', { time: formatTime(elapsed) }) }}</p>
  </div>
</template>

<script setup>
// Logical (logic grid) board. LogicalDisplay renders the story, clues and the
// answer table; the player asks for a check, and the server compares the
// table with the stored solution (shared/puzzles/logical.js).
// Grid, table, crossed-off clues, notepad and time are saved per puzzle
// (localStorage, and the server for logged-in players; ../engine/progress.js).

import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import LogicalDisplay from '@/components/LogicalDisplay.vue'
import { readProgress, saveProgress, clearProgress, formatTime } from '../engine/progress'

const props = defineProps({
  puzzle: { type: Object, required: true },
  submit: { type: Function, required: true },
  // { solved } once an answer given offline was checked (see PuzzlePage).
  offlineResult: { type: Object, default: null }
})
const emit = defineEmits(['solved'])

const { t } = useI18n()
const display = ref(null)
const solved = ref(false)
const checking = ref(false)
const message = ref('')
const elapsed = ref(0)
const started = ref(false)
const restored = ref(false)

function save () {
  if (solved.value) {
    clearProgress('logical', props.puzzle.id)
    return
  }
  if (!started.value || !display.value) return
  saveProgress('logical', props.puzzle.id, { ...display.value.saveState(), elapsed: elapsed.value })
}

// Saving on every change would write on each mouse move of a drag; once a
// second is plenty (and the timer saves every 10 s anyway).
let saveTimer = null
function onProgress () {
  if (solved.value) return
  started.value = true
  restored.value = false
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 1000)
}

function restore () {
  solved.value = false
  message.value = ''
  const saved = readProgress('logical', props.puzzle.id)
  const ok = Boolean(saved) && display.value.restoreState(saved)
  elapsed.value = ok ? Number(saved.elapsed) || 0 : 0
  started.value = ok
  restored.value = ok
}

// PuzzlePage keys the board by puzzle id, so one board is one puzzle.
onMounted(restore)

// LogicalDisplay emits (complete, table): table has one row per value of the
// first attribute, that value in column 0.
const check = async (isComplete, table) => {
  if (!isComplete) {
    message.value = t('logical.fillAll')
    return
  }
  checking.value = true
  try {
    const result = await props.submit(table, { seconds: elapsed.value })
    if (result === true) finish()
    else if (result === 'offline') message.value = t('puzzle.offlineCheckLater')
    else message.value = t('logical.mistakes')
  } finally {
    checking.value = false
  }
}

function finish () {
  solved.value = true
  message.value = t('logical.solved')
  clearTimeout(saveTimer)
  save()
  emit('solved')
}

// The answer given offline has been checked by now.
watch(() => props.offlineResult, (result) => {
  if (!result || solved.value) return
  if (result.solved) finish()
  else message.value = t('logical.mistakes')
})

let timer = null
function tick () {
  if (started.value && !solved.value && document.visibilityState === 'visible') {
    elapsed.value += 1
    if (elapsed.value % 10 === 0) save()
  }
}

onMounted(() => { timer = window.setInterval(tick, 1000) })
onBeforeUnmount(() => {
  window.clearInterval(timer)
  clearTimeout(saveTimer)
  save()
})
</script>

<style lang="scss" scoped>
@import '../engine/board.scss';

.check-solution {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 20px;

  .success-icon {
    margin: 0 10px;
  }

  .solution-message {
    margin: 0;
    font-size: 16px;
  }
}
</style>
