<template>
  <div class="puzzle-container">
    <!-- Header -->
    <div class="puzzle-header" v-if="logical != null">
      <h1 class="puzzle-title">{{ logical.name }}</h1>
      <span class="difficulty">{{ logical.difficulty }}/<strong>5</strong></span>
    </div>

    <!-- Main Puzzle Area -->
    <div class="puzzle-body" v-if="logical != null">
      <!-- Image and Description -->
      <div class="puzzle-intro">
        <img v-if="logical.image" class="header-image" :src="logical.image" alt="header image" width="320" />
        <div class="description-section">
          <h3>Beschreibung</h3>
          <p>{{ logical.description }}</p>
          <div class="question">
            <strong>{{ logical.question }}</strong>
          </div>
        </div>
      </div>

      <!-- Clues Section -->
      <div class="clues-section">
        <h3>Hinweise</h3>
        <ol class="clues-list">
          <li v-for="(clue, i) in logical.clues" :key="`clueActual${i}`" class="clue">
            {{ clue }}
          </li>
        </ol>
      </div>

      <!-- Attributes Section -->
      <div class="attributes-section">
        <h3>Attribute</h3>
        <ul class="attributes-list">
          <li v-for="(attr, i) in logical.attributes" :key="`realAtr${i}`">
            <div class="attribute-row">
              <strong>{{ attr.name }}: </strong>
              <span v-for="(v, j) in attr.values" :key="`realAt${j}`">
                {{ v }}<span v-if="j != attr.values.length - 1">, </span>
              </span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Solution Section -->
      <div class="solution-section">
        <h3>Lösung</h3>
        <div class="solution-container">
          <!-- Toggle for Extended Table -->
          <div class="toggle-container">
            <label>Zeige die erweiterte Tabelle:</label>
            <MToggle class="solution-toggle" v-model="tableVisible" />
          </div>

          <!-- Extended Table -->
          <div v-if="tableVisible" class="extended-table">
            <!-- Color Controls -->
            <div class="color-controls">
              <svg id="colors" height="50" width="150">
                <g v-for="(color, i) in colors" :key="`color${i}`" :transform="`translate(${5 + i * (cellWidth + 10)}, 5)`">
                  <rect :fill="color" stroke="black" :width="cellWidth" :height="cellWidth" @click="selectColor(i)" />
                  <path v-if="i == 0" class="cross-path" :d="`M5 5L${cellWidth - 5} ${cellWidth - 5}M5 ${cellWidth - 5}L${cellWidth - 5} 5`" stroke="#565656" />
                  <rect v-if="selectedColor == i" fill="#f55656" :width="cellWidth" height="3" :y="cellWidth + 4" />
                </g>
              </svg>
              <div class="control-buttons">
                <button class="control-button" @click="revertState">
                  <ion-icon class="rotate" v-pre name="return-up-back-outline"></ion-icon>
                </button>
                <button class="control-button" @click="restoreState">
                  <ion-icon v-pre name="refresh"></ion-icon>
                </button>
              </div>
            </div>

            <!-- Grid -->
            <div class="grid-container">
              <div class="solution-grid">
                <svg :width="svgWidth" :height="svgHeight">
                  <!-- Horizontal Labels -->
                  <g v-for="(attr, i) in logical.attributes.slice(0, 1).concat(logical.attributes.slice(2))" 
                     :key="`hgroup${i}`" 
                     class="horizontal-text-group" 
                     :transform="`translate(${paddingLeft - 15}, ${paddingTop + i * numAttrValues * cellWidth})`">
                    <text v-for="(val, j) in attr.values" 
                          :key="`htext${i}_${j}`"
                          ref="horizontalLabelsRef"
                          x="0" 
                          :y="j * cellWidth + cellWidth / 2"
                          class="horizontal-label">{{ val }}</text>
                  </g>

                  <!-- Vertical Labels -->
                  <g v-for="(attr, i) in logical.attributes.slice(1)" 
                     :key="`vgroup${i}`" 
                     class="vertical-text-group">
                    <text v-for="(val, j) in attr.values" 
                          :key="`vtext${i}_${j}`"
                          ref="verticalLabelsRef"
                          :x="paddingLeft + (i * numAttrValues + j) * cellWidth + cellWidth/2"
                          :y="paddingTop - 15"
                          style="writing-mode: tb;"
                          class="vertical-label">{{ val }}</text>
                  </g>
                  <g id="blockArea" :transform="`translate(${paddingLeft}, ${paddingTop})`">
                    <template v-for="i in numAttributes">
                      <g v-for="j in numAttributes - i" :key="`cblock${i}_${j}`" :transform="`translate(${(j - 1) * blockWidth}, ${(i - 1) * blockWidth})`">
                        <g v-for="k in numAttrValues * numAttrValues" :key="`cell${k}`" :transform="`translate(${Math.floor((k - 1) / numAttrValues) * cellWidth}, ${((k - 1) % numAttrValues) * cellWidth})`">
                          <rect :width="cellWidth" :height="cellWidth" class="blockGroups" :fill="colors[gridState[cellIndex(i, j, k)]]" stroke="#c5c5c5" @mousedown="mouseDown(i, j, k)" @mouseenter="mouseEnter(i, j, k)" />
                          <path v-if="gridState[cellIndex(i, j, k)] == 0" class="crossPath" :d="`M5 5L${cellWidth - 5} ${cellWidth - 5}M5 ${cellWidth - 5}L${cellWidth - 5} 5`" stroke="#565656" />
                        </g>
                      </g>
                    </template>
                    <path stroke="black" stroke-width="1" :d="drawOutline()" />
                  </g>
                </svg>
              </div>
            </div>
          </div>

          <!-- Solution Table -->
          <div class="solution-table">
            <table class="data-table sortable">
              <thead>
                <tr>
                  <th v-for="attr in logical.attributes" :key="attr.name" scope="col">{{ attr.name }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(v, i) in logical.attributes[0].values" :key="i">
                  <td scope="row">{{ v }}</td>
                  <td v-for="(attr, j) in logical.attributes.slice(1)" :key="j" :data-title="attr.name">
                    <MySelect :options="logical.attributes[j + 1].values" v-model="attrInputs[i + '_' + j]" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Check Solution Button -->
        <div class="check-solution">
          <button class="check-button" @click="checkSolution">Überprüfen</button>
          <img v-if="solved" class="success-icon" src="@/assets/haken.png" width="40" height="40" />
          <h4 class="solution-message">{{ solveLabel }}</h4>
        </div>
      </div>

      <!-- Rating Section -->
      <div class="rating-section">
        <h2>Rätsel bewerten</h2>
        <b-rate v-if="loggedIn" 
                v-model="rating" 
                icon-pack="mdi" 
                icon="star" 
                :max="rateMax" 
                :show-text="false" 
                :rtl="false" 
                :spaced="false" 
                :disabled="false">
        </b-rate>
        <p v-if="!loggedIn" class="login-message">Um das Rätsel zu bewerten, müssen Sie sich einloggen.</p>
        <div v-if="!solved && alreadySolved" class="already-solved">
          Glückwunsch! Sie haben dieses Rätsel bereits gelöst.
        </div>
      </div>
    </div>

    <!-- Comments -->
    <CommentSystem :riddleType="'logical'" :riddleId="computedId" />
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from "@/store/store";
import Toggle from './Toggle';
import MySelect from './MySelect';
import UserService from '@/services/UserService';
import LogicalService from '@/services/LogicalService';
import LogicalRatingService from '@/services/LogicalRatingService';
import CommentSystem from '@/components/CommentSystem';

export default {
  name: 'LogicalSolve',
  components: {
    MToggle: Toggle,
    MySelect: MySelect,
    CommentSystem: CommentSystem,
  },
  setup() {
    const route = useRoute();
    const store = useMainStore();

    const horizontalLabelsRef = ref(null);
    const verticalLabelsRef = ref(null);

    const revertHistory = ref([]);
    const revertIndex = ref(0);
    const attrInputs = ref({});
    const solved = ref(false);
    const gridState = ref([]);
    const gridStateCopy = ref([]);
    const cellWidth = ref(25);
    const paddingLeft = ref(100);
    const paddingTop = ref(80);
    const tableVisible = ref(true);
    const selectedColor = ref(0);
    const colors = ref(["#fff", "#777", "#fff"]);
    const solveLabel = ref("");
    const logical = ref({
      name: "",
      difficulty: 0,
      description: "",
      question: "",
      clues: [],
      attributes: [{ name: "", values: [] }],
      image: "",
      date: "",
      author: "",
      solution: [],
    });
    const rating = ref(null);
    const rateMax = ref(5);
    const alreadySolved = ref(false);
    const startMouseDown = ref([0, 0]);
    const lastMouseOver = ref([0, 0]);
    const isMouseDown = ref(false);

    const computedId = computed(() => route.params.id);
    const loggedIn = computed(() => store.isUserLoggedIn);
    const numAttrValues = computed(() => logical.value.attributes[0].values.length);
    const numAttributes = computed(() => logical.value.attributes.length);
    const blockWidth = computed(() => numAttrValues.value * cellWidth.value);
    const svgWidth = computed(() => paddingLeft.value + 20 + (numAttributes.value - 1) * blockWidth.value);
    const svgHeight = computed(() => paddingTop.value + 20 + (numAttributes.value - 1) * blockWidth.value);

    const fetchLogical = async (id) => {
      const response = await LogicalService.show(id);
      logical.value = response.data;
      setRating(id);
      if (loggedIn.value) {
        await checkIfAlreadySolved();
      }
    };

    const setRating = async (logicalId) => {
      if (store.user) {
        const res = await LogicalRatingService.show(logicalId);
        rating.value = res.data.rating;
      }
    };

    const checkIfAlreadySolved = async () => {
      const userData = (await UserService.show(store.user.id)).data;
      const logicalId = parseInt(route.params.id, 10) - 1;
      alreadySolved.value = userData.solvedLogicals.includes(logicalId);
    };

    const setPadding = () => {
      nextTick(() => {
        if (!horizontalLabelsRef.value || !verticalLabelsRef.value) {
          console.log("Refs not available yet");
          return;
        }

        // Calculate maximum width of horizontal labels
        let maxHorizontalWidth = 0;
        horizontalLabelsRef.value.forEach(label => {
          if (label) {
            const bbox = label.getBBox();
            maxHorizontalWidth = Math.max(maxHorizontalWidth, bbox.width);
          }
        });

        // Calculate maximum width of vertical labels
        let maxVerticalWidth = 0;
        verticalLabelsRef.value.forEach(label => {
          if (label) {
            const bbox = label.getBBox();
            maxVerticalWidth = Math.max(maxVerticalWidth, bbox.height);
          }
        });

        // Add padding with larger buffer space
        paddingLeft.value = Math.max(maxHorizontalWidth + 20, 80);
        paddingTop.value = Math.max(maxVerticalWidth + 20, 80);
      });
    };

    // Initialize grid state with empty cells (white)
    const initializeGridState = () => {
      const totalCells = computed(() => {
        let total = 0;
        for (let i = 0; i < numAttributes.value - 1; i++) {
          total += (numAttributes.value - 1 - i) * numAttrValues.value * numAttrValues.value;
        }
        return total;
      });
      
      gridState.value = new Array(totalCells.value).fill(2); // 2 represents white/empty cell
      gridStateCopy.value = [...gridState.value];
    };

    // Call initialization when logical data is loaded
    watch(() => logical.value, () => {
      nextTick(() => {
        initializeGridState();
        setPadding();
      });
    });

    const getCellIndex = (i, j, k) => {
      let index = 0;
      for (let c = 0; c < i - 1; c++) {
        index += numAttributes.value - 1 - c;
      }
      return (index + j - 1) * numAttrValues.value * numAttrValues.value + (k - 1);
    };

    const revertState = () => {
      if (revertIndex.value > 0) {
        revertIndex.value -= 1;
        const state = revertHistory.value[revertIndex.value];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            const [i, j, k] = toIJK(b, a);
            if (i !== -1) {
              const idx = getCellIndex(i, j, k);
              gridState.value[idx] = state['colorsBefore'][b - state['x0']][a - state['y0']];
            }
          }
        }
      }
    };

    const restoreState = () => {
      if (revertIndex.value < revertHistory.value.length) {
        const state = revertHistory.value[revertIndex.value];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            const [i, j, k] = toIJK(b, a);
            if (i !== -1) {
              const idx = getCellIndex(i, j, k);
              gridState.value[idx] = state['colorAfter'];
            }
          }
        }
        revertIndex.value += 1;
      }
    };

    const checkSolution = () => {
      solved.value = true;
      for (let i = 0; i < logical.value.solution.length; i++) {
        for (let j = 1; j < logical.value.solution[i].length; j++) {
          if (attrInputs.value[`${i}_${j - 1}`] == null) {
            solved.value = false;
            solveLabel.value = "Es sind Attribute noch nicht zugewiesen!";
            return;
          }
          if (logical.value.solution[i][j] != attrInputs.value[`${i}_${j - 1}`]) {
            solved.value = false;
          }
        }
      }
      if (solved.value) {
        if (!alreadySolved.value) {
          saveSolvedLogical();
        }
        solveLabel.value = "Gratulation, das Rätsel ist gelöst!";
      } else {
        solveLabel.value = "Es existieren noch Fehler!";
      }
    };

    const saveSolvedLogical = async () => {
      if (loggedIn.value) {
        const userId = store.user.id;
        const logicalId = parseInt(route.params.id, 10) - 1;
        const isSuccess = await UserService.logicalSolved(userId, logicalId);
        console.log("Suc", isSuccess);
      }
    };

    const toXY = (i, j, k) => {
      const x = (j - 1) * numAttrValues.value + Math.floor((k - 1) / numAttrValues.value);
      const y = (i - 1) * numAttrValues.value + (k - 1) % numAttrValues.value;
      return [x, y];
    };

    const toIJK = (x, y) => {
      const i = Math.floor(y / numAttrValues.value);
      const j = Math.floor(x / numAttrValues.value);
      if (j >= numAttributes.value - 1 - i) {
        return [-1, -1, -1];
      }
      const k = (x % numAttrValues.value) * numAttrValues.value + (y % numAttrValues.value);
      return [i + 1, j + 1, k + 1];
    };

    const mouseDown = (i, j, k) => {
      if (!solved.value) {
        isMouseDown.value = true;
        const [x, y] = toXY(i, j, k);
        startMouseDown.value = [x, y];
        lastMouseOver.value = [x, y];
        gridStateCopy.value = [...gridState.value];
        gridState.value[cellIndex(i, j, k)] = selectedColor.value;
      }
    };

    const mouseEnter = (i, j, k) => {
      if (isMouseDown.value) {
        const [i1, j1] = toXY(i, j, k);
        const [i2, j2] = startMouseDown.value;
        const [i3, j3] = lastMouseOver.value;

        if (i1 !== i3) {
          for (let x = Math.min(i1, i3); x <= Math.max(i1, i3); x++) {
            for (let y = Math.min(j2, j3); y <= Math.max(j2, j3); y++) {
              const [ni, nj, nk] = toIJK(x, y);
              if (ni !== -1) {
                const idx = cellIndex(ni, nj, nk);
                gridState.value[idx] = gridStateCopy.value[idx];
              }
            }
          }
        }
        if (j1 !== j3) {
          for (let y = Math.min(j1, j3); y <= Math.max(j1, j3); y++) {
            for (let x = Math.min(i2, i3); x <= Math.max(i2, i3); x++) {
              const [ni, nj, nk] = toIJK(x, y);
              if (ni !== -1) {
                const idx = cellIndex(ni, nj, nk);
                gridState.value[idx] = gridStateCopy.value[idx];
              }
            }
          }
        }

        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            const [ni, nj, nk] = toIJK(a, b);
            if (ni !== -1) {
              gridState.value[cellIndex(ni, nj, nk)] = selectedColor.value;
            }
          }
        }
        lastMouseOver.value = [i1, j1];
      }
    };

    const mainGridMouseUp = () => {
      if (isMouseDown.value) {
        const [i1, j1] = startMouseDown.value;
        const [i2, j2] = lastMouseOver.value;
        const stateBefore = [];
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          const stateBeforeRow = [];
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            const [ni, nj, nk] = toIJK(a, b);
            if (ni !== -1) {
              const idx = getCellIndex(ni, nj, nk);
              stateBeforeRow.push(gridStateCopy.value[idx]);
            }
          }
          stateBefore.push(stateBeforeRow);
        }

        const revertObj = {
          'x0': Math.min(i1, i2),
          'x1': Math.max(i1, i2),
          'y0': Math.min(j1, j2),
          'y1': Math.max(j1, j2),
          'colorAfter': selectedColor.value,
          'colorsBefore': stateBefore
        };

        if (revertIndex.value < revertHistory.value.length) {
          revertHistory.value = revertHistory.value.slice(0, revertIndex.value);
        }
        revertHistory.value.push(revertObj);
        revertIndex.value = revertHistory.value.length;
        isMouseDown.value = false;
      }
    };

    const drawOutline = () => {
      let pathStr = `M0 0H${blockWidth.value * (numAttributes.value - 1)}`;
      for (let i = 0; i < numAttributes.value - 1; i++) {
        pathStr += `M0 ${blockWidth.value * (i + 1)}H${blockWidth.value * (numAttributes.value - 1 - i)}`;
      }
      pathStr += `M0 0V${blockWidth.value * (numAttributes.value - 1)}`;
      for (let i = 0; i < numAttributes.value - 1; i++) {
        pathStr += `M${blockWidth.value * (i + 1)} 0V${blockWidth.value * (numAttributes.value - 1 - i)}`;
      }
      return pathStr;
    };

    const cellIndex = (i, j, k) => {
      let index = 0;
      for (let c = 0; c < i - 1; c++) {
        index += numAttributes.value - 1 - c;
      }
      return (index + j - 1) * numAttrValues.value * numAttrValues.value + (k - 1);
    };

    const selectColor = (i) => {
      selectedColor.value = i;
    };

    onMounted(() => {
      fetchLogical(route.params.id);
      tableVisible.value = true;
      document.addEventListener("mouseup", mainGridMouseUp);
      window.ondragstart = () => false;
      setPadding();
      window.onbeforeunload = () => "Möchten Sie die Seite wirklich verlassen. Nicht gespeicherte Rätsel sind für immer verloren!";
    });

    onBeforeUnmount(() => {
      document.removeEventListener("mouseup", mainGridMouseUp);
    });

    watch(route, (newRoute) => {
      fetchLogical(newRoute.params.id);
    });

    watch(loggedIn, (newValue) => {
      if (newValue) {
        checkIfAlreadySolved();
        setRating(route.params.id);
      }
    });

    watch(rating, async (newRating) => {
      if (newRating != null) {
        try {
          await LogicalRatingService.post({
            LogicalId: parseInt(route.params.id, 10),
            rating: newRating,
          });
        } catch (err) {
          console.log(err);
        }
      }
    });

    return {
      horizontalLabelsRef,
      verticalLabelsRef,
      revertHistory,
      revertIndex,
      attrInputs,
      solved,
      gridState,
      gridStateCopy,
      cellWidth,
      paddingLeft,
      paddingTop,
      tableVisible,
      selectedColor,
      colors,
      solveLabel,
      logical,
      rating,
      rateMax,
      alreadySolved,
      computedId,
      loggedIn,
      numAttrValues,
      numAttributes,
      blockWidth,
      svgWidth,
      svgHeight,
      fetchLogical,
      setRating,
      checkIfAlreadySolved,
      setPadding,
      revertState,
      restoreState,
      checkSolution,
      saveSolvedLogical,
      toXY,
      toIJK,
      mouseDown,
      mouseEnter,
      mainGridMouseUp,
      drawOutline,
      cellIndex,
      selectColor,
      initializeGridState,
      getCellIndex,
    };
  },
};
</script>

<style lang="scss" scoped>
.puzzle-container {
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

  .difficulty {
    font-size: 18px;
  }
}

.puzzle-body {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.puzzle-intro {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;

  .header-image {
    border-radius: 8px;
    object-fit: cover;
  }

  .description-section {
    flex: 1;

    h3 {
      margin-top: 0;
    }

    .question {
      margin-top: 15px;
      font-size: 1.1em;
    }
  }
}

.clues-section, 
.attributes-section {
  margin-bottom: 30px;

  h3 {
    margin-bottom: 15px;
  }
}

.clues-section {
  background-color: #f3f3f3;
  padding: 15px;
}

.clues-list {
  padding-left: 20px;

  .clue {
    margin-bottom: 8px;
  }
}

.attributes-list {
  list-style: none;
  padding: 0;

  .attribute-row {
    margin-bottom: 8px;
  }
}

.solution-section {
  .toggle-container {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  .color-controls {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
  }
}

.control-buttons {
  display: flex;
  gap: 10px;
}

.control-button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  &:hover {
    background: #e9ecef;
  }

  ion-icon {
    font-size: 20px;
  }

  &.rotate ion-icon {
    transform: scaleX(-1);
  }
}

.grid-container {
  margin: 20px 0;
  overflow: visible;
}

.solution-table {
  margin-top: 20px;
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
    
    th, td {
      padding: 10px;
      border: 1px solid #ddd;
    }

    th {
      background: #f5f5f5;
    }
  }
}

.check-solution {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 20px;

  .check-button {
    padding: 10px 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.2s;

    &:hover {
      background: #45a049;
    }
  }

  .success-icon {
    margin: 0 10px;
  }

  .solution-message {
    margin: 0;
    font-size: 16px;
  }
}

.rating-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;

  h2 {
    margin-bottom: 15px;
  }

  .login-message {
    color: #666;
  }

  .already-solved {
    margin-top: 10px;
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

  .puzzle-intro {
    flex-direction: column;
  }

  .header-image {
    width: 100%;
    height: auto;
  }
}

.horizontal-text-group {
  .horizontal-label {
    text-anchor: end;
    dominant-baseline: middle;
    font-size: 12px;
    fill: #333;
    white-space: nowrap;
  }
}

.vertical-text-group {
  .vertical-label {
    text-anchor: end;
    dominant-baseline: central;
    font-size: 12px;
    fill: #333;
    white-space: nowrap;
  }
}

.solution-grid {
  position: relative;
  margin: 20px 0;
  
  svg {
    overflow: visible;
  }
}
</style>