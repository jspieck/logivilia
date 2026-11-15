<template>
  <div
    class="star-rating"
    :class="{ 'is-disabled': disabled }"
    role="radiogroup"
    :aria-label="label || $t('overview.rating')"
    @mouseleave="hovered = 0"
  >
    <button
      v-for="star in max"
      :key="star"
      type="button"
      class="star"
      role="radio"
      :aria-checked="Math.round(modelValue || 0) === star"
      :aria-label="`${star} / ${max}`"
      :disabled="disabled"
      @mouseenter="!disabled && (hovered = star)"
      @click="select(star)"
    >
      <i class="mdi mdi-star star-base"></i>
      <i class="mdi mdi-star star-fill" :style="{ width: fillPercent(star) + '%' }"></i>
    </button>
  </div>
</template>

<script setup>
// Replaces Buefy's <b-rate>. Shows fractional averages (e.g. 3.4) when
// disabled, and emits whole-star ratings when clicked.
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: 0 },
  max: { type: Number, default: 5 },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const hovered = ref(0)

function fillPercent (star) {
  const value = hovered.value || Number(props.modelValue) || 0
  return Math.max(0, Math.min(1, value - (star - 1))) * 100
}

function select (star) {
  if (!props.disabled) {
    emit('update:modelValue', star)
  }
}
</script>

<style scoped>
.star-rating {
  display: inline-flex;
  align-items: center;
}
.star {
  position: relative;
  display: inline-block;
  padding: 0;
  border: 0;
  background: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}
.star:disabled {
  cursor: default;
}
.star-base {
  color: #dbdbdb;
}
.star-fill {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  white-space: nowrap;
  color: #ffdd57;
}
.star:not(:disabled):focus-visible {
  outline: 2px solid #485fc7;
  outline-offset: 2px;
}
</style>
