<template>
  <div class="board">
    <LogicalDisplay
      ref="display"
      :logical="puzzle"
      :is-preview="false"
      :solved="solved"
      @solution-check="check"
    />
    <div class="check-solution">
      <button class="button is-primary" :disabled="checking" @click="display.checkSolution()">Überprüfen</button>
      <img v-if="solved" class="success-icon" src="@/assets/haken.png" width="40" height="40" alt="" />
      <h4 class="solution-message">{{ message }}</h4>
    </div>
  </div>
</template>

<script setup>
// Logical (logic grid) board. LogicalDisplay renders the story, clues and the
// answer table; the player asks for a check, and the server compares the
// table with the stored solution (shared/puzzles/logical.js).

import { ref, watch } from 'vue'
import LogicalDisplay from '@/components/LogicalDisplay.vue'

const props = defineProps({
  puzzle: { type: Object, required: true },
  submit: { type: Function, required: true }
})
const emit = defineEmits(['solved'])

const display = ref(null)
const solved = ref(false)
const checking = ref(false)
const message = ref('')

watch(() => props.puzzle, () => {
  solved.value = false
  message.value = ''
})

// LogicalDisplay emits (complete, table): table has one row per value of the
// first attribute, that value in column 0.
const check = async (isComplete, table) => {
  if (!isComplete) {
    message.value = 'Bitte zuerst alle Felder ausfüllen.'
    return
  }
  checking.value = true
  try {
    if (await props.submit(table)) {
      solved.value = true
      message.value = 'Gratulation, das Rätsel ist gelöst!'
      emit('solved')
    } else {
      message.value = 'Es existieren noch Fehler!'
    }
  } finally {
    checking.value = false
  }
}
</script>

<style lang="scss" scoped>
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
