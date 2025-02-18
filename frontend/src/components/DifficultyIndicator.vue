<script setup>
defineProps({
  difficulty: {
    type: Number,
    required: true,
    validator: (value) => value >= 1 && value <= 5
  },
  maxDifficulty: {
    type: Number,
    default: 5
  }
})
</script>

<template>
  <div class="difficulty-indicator">
    <div class="difficulty-label">Schwierigkeit</div>
    <div class="difficulty-bar">
      <div 
        class="difficulty-progress"
        :style="{ width: `${(difficulty/maxDifficulty) * 100 + 3}%` }"
        :class="`level-${difficulty}`"
      ></div>
      <div 
        v-for="n in maxDifficulty" 
        :key="n"
        class="difficulty-marker"
        :class="{ active: n <= difficulty }"
      >
        {{ n }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.difficulty-indicator {
  background: white;
  border-radius: 12px;
}

.difficulty-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.difficulty-bar {
  position: relative;
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
}

.difficulty-progress {
  position: absolute;
  height: 100%;
  left: 0;
  top: 0;
  transition: width 0.3s ease;
  border-radius: 12px;

  &.level-1 { background: linear-gradient(90deg, #4CAF50, #8BC34A); }
  &.level-2 { background: linear-gradient(90deg, #8BC34A, #CDDC39); }
  &.level-3 { background: linear-gradient(90deg, #FFEB3B, #FFC107); }
  &.level-4 { background: linear-gradient(90deg, #FFC107, #FF9800); }
  &.level-5 { background: linear-gradient(90deg, #FF9800, #F44336); }
}

.difficulty-marker {
  position: absolute;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #666;
  transition: all 0.3s ease;
  
  @for $i from 1 through 5 {
    &:nth-child(#{$i + 1}) {
      left: calc(#{($i - 1)} * 19%);
    }
  }

  &.active {
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
}
</style> 