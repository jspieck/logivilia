<template>
  <div>
    <h2>Linelog erstellen</h2>
    <div id="wrapMe" class="wrapMe">
      <label>Rätselvorschau:</label>
      <Toggle class="solutionToggle" v-model="preview"/>
    </div>
    <div class="columns">
      <div :class="preview ? ['column', 'is-one-third'] : 'column'">
        <div class="puzzleSet">
          <!-- Meta Information -->
          <b-field label="Name des Rätsels">
            <input v-model="linelog.name" class="input"/>
          </b-field>
          <p class="error" v-if="!nameFinished">Bitte einen Namen für das Rätsel festlegen.</p>

          <b-field label="Schwierigkeit">
            <MySelect :options="difficulties" v-model="linelog.difficulty"/>
          </b-field>

          <!-- Grid Size Configuration -->
          <b-field label="Rätselgröße">
            <div class="size-inputs">
              <div class="size-input">
                <label>Breite:</label>
                <input type="number" v-model.number="width" min="1" max="20" @change="initializeGrid" class="input"/>
              </div>
              <div class="size-input">
                <label>Höhe:</label>
                <input type="number" v-model.number="height" min="1" max="20" @change="initializeGrid" class="input"/>
              </div>
            </div>
          </b-field>

          <!-- Color Selection -->
          <b-field label="Farben">
            <div class="color-controls">
              <button 
                v-for="(color, index) in linelog.colors" 
                :key="index"
                class="color-button"
                :class="{ active: selectedColor === index }"
                :style="{ backgroundColor: color }"
                @click="selectedColor = index"
              >
              </button>
              <button @click="addColor" class="add-color" :disabled="linelog.colors.length >= 10">+</button>
            </div>
          </b-field>

          <!-- Grid Editor -->
          <b-field label="Rätsel erstellen">
            <div class="grid-editor">
              <div class="grid-container">
                <svg 
                  class="grid-svg"
                  :width="width * cellSize" 
                  :height="height * cellSize"
                  @mousedown="startDrawing"
                  @mousemove="continueDrawing"
                  @mouseup="endDrawing"
                  @mouseleave="endDrawing"
                  @touchstart="handleTouchStart"
                  @touchmove="handleTouchMove"
                  @touchend="handleTouchEnd"
                >
                  <!-- Background Grid -->
                  <defs>
                    <pattern :id="'grid-pattern'" :width="cellSize" :height="cellSize" patternUnits="userSpaceOnUse">
                      <rect width="100%" height="100%" fill="white"/>
                      <path :d="`M ${cellSize} 0 L 0 0 0 ${cellSize}`" fill="none" stroke="#ddd" stroke-width="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-pattern)"/>
                  
                  <!-- Solution Paths -->
                  <path 
                    v-for="path in paths" 
                    :key="path.id"
                    :d="generatePathD(path.points)"
                    :stroke="linelog.colors[path.colorIndex]"
                    stroke-width="3"
                    fill="none"
                  />
                  
                  <!-- Current Path -->
                  <path 
                    v-if="currentPath.length > 0"
                    :d="generatePathD(currentPath)"
                    :stroke="linelog.colors[selectedColor]"
                    stroke-width="3"
                    fill="none"
                    stroke-dasharray="5,5"
                  />

                  <!-- Grid Cells -->
                  <g v-for="(row, y) in gridState" :key="y">
                    <g v-for="(cell, x) in row" :key="`${x}-${y}`">
                      <!-- Cell Background -->
                      <rect
                        :x="x * cellSize"
                        :y="y * cellSize"
                        :width="cellSize"
                        :height="cellSize"
                        :fill="linelog.colors[cell]"
                        class="grid-cell"
                      />
                      <!-- Numbers -->
                      <text
                        v-if="information[y][x] > 0"
                        :x="(x + 0.5) * cellSize"
                        :y="(y + 0.5) * cellSize"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        :fill="getFontColor(cell)"
                        class="cell-number"
                      >{{ information[y][x] }}</text>
                    </g>
                  </g>
                </svg>
              </div>
            </div>
          </b-field>

          <b-field label="Autor">
            <input v-model="linelog.author" class="input"/>
          </b-field>

          <button @click="createLinelog" :disabled="!isValid" class="create-button">Rätsel erstellen</button>
          <p class="error" v-if="!isValid">Bitte alle erforderlichen Felder ausfüllen.</p>
        </div>
      </div>

      <!-- Preview -->
      <div class="column" v-if="preview">
        <LinelogDisplay :linelog="previewLinelog"/>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useOruga } from '@oruga-ui/oruga-next';
import Toggle from './Toggle.vue';
import MySelect from './MySelect.vue';
import LinelogService from '@/services/LinelogService';
import LinelogDisplay from './LinelogDisplay.vue';

const oruga = useOruga();
const difficulties = ref([1, 2, 3, 4, 5]);
const preview = ref(true);
const selectedColor = ref(0);
const width = ref(12);
const height = ref(6);
const cellSize = ref(40);

// State
const linelog = ref({
  name: "",
  difficulty: 1,
  width: 12,
  height: 6,
  information: [],
  solution: [],
  colors: ["#FFFFFF", "#CD5C5C", "#000000"], // White, Indian Red, Black
  author: "",
  date: new Date().toISOString().slice(0, 10)
});

const gridState = ref([]);
const information = ref([]);
const paths = ref([]);
const currentPath = ref([]);
const isDrawing = ref(false);
const pathId = ref(0);

// Initialize grids
const initializeGrid = () => {
  linelog.value.width = width.value;
  linelog.value.height = height.value;
  
  gridState.value = Array(height.value).fill().map(() => 
    Array(width.value).fill(0)
  );

  information.value = Array(height.value).fill().map(() => 
    Array(width.value).fill(0)
  );

  paths.value = [];
  pathId.value = 0;
};

// Initialize on component creation
initializeGrid();

// Drawing methods
const startDrawing = (event) => {
  const { x, y } = getCellCoordinates(event);
  if (isValidCell(x, y)) {
    isDrawing.value = true;
    currentPath.value = [[x, y]];
    gridState.value[y][x] = selectedColor.value;
  }
};

const continueDrawing = (event) => {
  if (!isDrawing.value) return;
  
  const { x, y } = getCellCoordinates(event);
  if (isValidCell(x, y) && isAdjacent(x, y)) {
    if (!currentPath.value.some(([px, py]) => px === x && py === y)) {
      currentPath.value.push([x, y]);
      gridState.value[y][x] = selectedColor.value;
    }
  }
};

const endDrawing = () => {
  if (!isDrawing.value) return;
  
  if (currentPath.value.length > 1) {
    // Add numbers at start and end
    const [startX, startY] = currentPath.value[0];
    const [endX, endY] = currentPath.value[currentPath.value.length - 1];
    const pathLength = currentPath.value.length;
    
    information.value[startY][startX] = pathLength;
    information.value[endY][endX] = pathLength;
    
    paths.value.push({
      id: pathId.value++,
      points: [...currentPath.value],
      colorIndex: selectedColor.value
    });
  }
  
  isDrawing.value = false;
  currentPath.value = [];
};

// Helper methods
const getCellCoordinates = (event) => {
  const rect = event.target.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / cellSize.value);
  const y = Math.floor((event.clientY - rect.top) / cellSize.value);
  return { x, y };
};

const isValidCell = (x, y) => {
  return x >= 0 && x < width.value && y >= 0 && y < height.value;
};

const isAdjacent = (x, y) => {
  if (currentPath.value.length === 0) return true;
  const [lastX, lastY] = currentPath.value[currentPath.value.length - 1];
  const dx = Math.abs(x - lastX);
  const dy = Math.abs(y - lastY);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
};

const generatePathD = (points) => {
  if (!points || points.length === 0) return '';
  const [startX, startY] = points[0];
  let d = `M ${(startX + 0.5) * cellSize.value} ${(startY + 0.5) * cellSize.value}`;
  
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    d += ` L ${(x + 0.5) * cellSize.value} ${(y + 0.5) * cellSize.value}`;
  }
  
  return d;
};

const getFontColor = (colorIndex) => {
  const color = linelog.value.colors[colorIndex];
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000000' : '#FFFFFF';
};

// Touch event handlers
const handleTouchStart = (event) => {
  event.preventDefault();
  const touch = event.touches[0];
  startDrawing(touch);
};

const handleTouchMove = (event) => {
  event.preventDefault();
  const touch = event.touches[0];
  continueDrawing(touch);
};

const handleTouchEnd = (event) => {
  event.preventDefault();
  endDrawing();
};

// Color management
const addColor = () => {
  if (linelog.value.colors.length < 10) {
    linelog.value.colors.push("#000000");
  }
};

// Computed
const nameFinished = computed(() => linelog.value.name !== "");

const isValid = computed(() => {
  return nameFinished.value && 
         width.value > 0 && 
         height.value > 0 && 
         linelog.value.colors.length >= 2;
});

const previewLinelog = computed(() => ({
  ...linelog.value,
  solution: gridState.value,
  information: information.value
}));

// Create Linelog
const createLinelog = async () => {
  if (!isValid.value) return;

  try {
    const linelogData = {
      ...linelog.value,
      solution: gridState.value,
      information: information.value
    };

    await LinelogService.post(linelogData);
    oruga.notification.open({
      message: 'Linelog erfolgreich erstellt!',
      duration: 2000,
      variant: 'success'
    });
  } catch (error) {
    console.error('Error creating linelog:', error);
    oruga.notification.open({
      message: 'Fehler beim Erstellen des Linelogrätsels',
      duration: 2000,
      variant: 'danger'
    });
  }
};
</script>

<style lang="scss" scoped>
.grid-editor {
  margin: 20px 0;
}

.grid-container {
  overflow-x: auto;
  margin-top: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
}

.grid-svg {
  display: block;
  margin: 0 auto;
  touch-action: none;
}

.grid-cell {
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
}

.cell-number {
  font-size: 14px;
  font-weight: bold;
  pointer-events: none;
}

.color-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.color-button {
  width: 36px;
  height: 36px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active {
    border-color: #2196F3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
  }

  &:hover {
    transform: scale(1.1);
  }
}

.add-color {
  width: 36px;
  height: 36px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: #45a049;
  }
}

.size-inputs {
  display: flex;
  gap: 20px;
}

.size-input {
  display: flex;
  align-items: center;
  gap: 10px;

  input {
    width: 60px;
  }
}

.error {
  color: red;
  font-size: 0.9em;
  margin-top: 5px;
}

.create-button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background-color: #45a049;
  }
}
</style> 