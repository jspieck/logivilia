<template>
  <div class="puzzle-container">
    <!-- Header -->
    <div class="puzzle-header">
      <h1 class="puzzle-title">{{ linelog.name }}</h1>
      <DifficultyIndicator 
        :difficulty="linelog.difficulty"
        :maxDifficulty="5"
      />
    </div>

    <!-- Main Puzzle Area -->
    <div class="puzzle-body">
      <div id="linelogGridContainer">
        <svg 
          id="mainArea" 
          draggable="false" 
          :width="width * cellWidth + 1" 
          :height="height * cellWidth + 1"
        >
          <!-- Grid Pattern -->
          <defs>
            <pattern id="smallGrid" :width="cellWidth" :height="cellWidth" patternUnits="userSpaceOnUse">
              <path :d="`M ${cellWidth} 0 L 0 0 0 ${cellWidth}`" fill="none" stroke="#929292" stroke-width="1"/>
            </pattern>
            <pattern id="grid" :width="cellWidth * 5" :height="cellWidth * 5" patternUnits="userSpaceOnUse">
              <rect :width="cellWidth * 5" :height="cellWidth * 5" fill="url(#smallGrid)"/>
              <path :d="`M ${cellWidth * 5} 0 L 0 0 0 ${cellWidth * 5}`" fill="none" stroke="black" stroke-width="2"/>
            </pattern>
          </defs>

          <!-- Grid Background -->
          <rect width="100%" height="100%" fill="url(#grid)" style="pointer-events: none" />

          <!-- Grid Cells -->
          <template v-for="(row, y) in linelog.information" :key="y">
            <template v-for="(cell, x) in row" :key="`${x}-${y}`">
              <g 
                class="gridCell linelogNoSelect" 
                :transform="`translate(${cellWidth * x}, ${cellWidth * y})`"
              >
                <!-- Cell Background -->
                <rect 
                  :width="cellWidth" 
                  :height="cellWidth" 
                  :fill="linelog.colors[linelog.solution[y][x]]"
                />
                
                <!-- Information Circle -->
                <circle 
                  v-if="cell !== 0"
                  :cx="cellWidth / 2" 
                  :cy="cellWidth / 2" 
                  :r="cellWidth * 0.4" 
                  :fill="linelog.colors[linelog.solution[y][x]]"
                />
                
                <!-- Information Number -->
                <text 
                  v-if="cell !== 0"
                  :x="cellWidth / 2" 
                  :y="cellWidth / 2" 
                  :fill="getFontColor(linelog.solution[y][x])"
                  dominant-baseline="middle" 
                  text-anchor="middle" 
                  :style="`font-size: ${fontSize}px;`"
                >
                  {{ cell }}
                </text>
              </g>
            </template>
          </template>
        </svg>
      </div>

      <!-- Meta Information -->
      <div class="meta-info" v-if="showMeta">
        <div class="meta-item">
          <span class="meta-label">Autor:</span>
          <span class="meta-value">{{ linelog.author }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Datum:</span>
          <span class="meta-value">{{ formatDate(linelog.date) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import DifficultyIndicator from './DifficultyIndicator.vue';

const props = defineProps({
  linelog: {
    type: Object,
    required: true
  },
  showMeta: {
    type: Boolean,
    default: true
  }
});

// Constants
const cellWidth = ref(25);
const fontSize = ref(14);

// Computed
const width = computed(() => props.linelog.width);
const height = computed(() => props.linelog.height);

// Methods
const getFontColor = (colorIndex) => {
  const color = props.linelog.colors[colorIndex];
  // Convert hex to RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('de-DE');
};
</script>

<style lang="scss" scoped>
.puzzle-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.puzzle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  .puzzle-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
}

.puzzle-body {
  position: relative;
}

#linelogGridContainer {
  overflow-x: auto;
  margin: 20px 0;
  
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
    
    &:hover {
      background: #555;
    }
  }
}

#mainArea {
  display: block;
  margin: 0 auto;
}

.linelogNoSelect {
  user-select: none;
  pointer-events: none;
}

.meta-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;

  .meta-item {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;

    .meta-label {
      font-weight: 600;
      color: #666;
    }

    .meta-value {
      color: #333;
    }
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