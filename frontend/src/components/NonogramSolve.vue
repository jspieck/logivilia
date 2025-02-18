<template>
  <div class="puzzle-container">
    <!-- Header -->
    <div class="puzzle-header">
      <h1 class="puzzle-title">{{ nonogram.name }}</h1>
      <DifficultyIndicator 
        :difficulty="nonogram.difficulty"
        :maxDifficulty="5"
      />
    </div>

    <!-- Main Puzzle Area -->
    <div class="puzzle-body">
      <div id="nonoArea">
        <!-- Controls -->
        <div class="control-panels">
          <div class="control-card">
            <div class="control-label">Farben</div>
            <div class="color-controls">
              <button 
                v-for="(color, index) in colors" 
                :key="index"
                class="color-button"
                :style="{ backgroundColor: color }"
                :class="{ active: selectedColor === index }"
                @click="selectColor(index)"
              >
                <div v-if="index === colors.length - 1" class="empty-cell-dot"></div>
              </button>
            </div>
          </div>

          <div class="control-card">
            <div class="control-label">Zoom</div>
            <div class="size-controls">
              <button class="size-button" @click="zoomOut">
                <ion-icon name="remove-outline"></ion-icon>
              </button>
              <button class="size-button" @click="zoomIn">
                <ion-icon name="add-outline"></ion-icon>
              </button>
            </div>
          </div>

          <div class="control-card">
            <div class="control-label">Rückgängig</div>
            <div class="size-controls">
              <button @click="revertState" class="size-button">
                <ion-icon v-pre name="return-up-back-outline"></ion-icon>
              </button>
              <button  @click="restoreState" class="size-button">
                <ion-icon v-pre name="refresh"></ion-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Main Grid Area -->
        <div id="nonoMainArea">
          <table class="nonoGrid">
            <tr>
              <td></td>
              <td>
                <!-- Vertical Information -->
                <svg v-if="!solved" id="verticalInformation" ref="verticalInformation" draggable="false" 
                     :height="verticalHeight * cellWidth + 8" :width="width * cellWidth + 1">
                  <defs>
                    <pattern id="smallGrid" :width="cellWidth" :height="cellWidth" patternUnits="userSpaceOnUse">
                      <path :d="`M ${cellWidth} 0 L 0 0 0 ${cellWidth}`" fill="none" stroke="#d7dadd" stroke-width="1" />
                    </pattern>
                    <pattern id="grid" :width="cellWidth * 5" :height="cellWidth * 5" patternUnits="userSpaceOnUse">
                      <rect :width="cellWidth * 5" :height="cellWidth * 5" fill="url(#smallGrid)" />
                      <path :d="`M ${cellWidth * 5} 0 L 0 0 0 ${cellWidth * 5}`" fill="none" stroke="black" stroke-width="2" />
                    </pattern>
                  </defs>

                  <template v-for="(group, groupIndex) in verticalInfo" :key="`group-${groupIndex}`">
                    <template v-for="(row, rowIndex) in group" :key="`row-${rowIndex}`">
                      <g v-for="(cell, cellIndex) in row" :key="`cellCol${cell.id}`"
                          @click="selectColor(cell.colorId)"
                         :id="cell.id" 
                         :transform="`translate(${cellWidth * rowIndex + groupIndex * 5 * cellWidth}, ${cellWidth * cellIndex})`">
                        <rect :width="cellWidth" 
                              :height="cellWidth" 
                              :fill="cell.background" />
                        <text :x="cellWidth / 2" 
                              :y="cellWidth / 2" 
                              :fill="cell.color" 
                              dominant-baseline="middle" 
                              text-anchor="middle" 
                              :style="`font-size: ${fontSize}px;`">{{ cell.blockLength }}</text>
                      </g>
                      <rect :y="verticalHeight * cellWidth" 
                            :x="cellWidth * (rowIndex + groupIndex * 5)" 
                            :width="cellWidth" 
                            height="7" 
                            :fill="indicatorColors[indicatorVertical[groupIndex * 5 + rowIndex]]" />
                    </template>
                  </template>
                  <rect width="100%" height="100%" fill="url(#grid)" style="pointer-events: none" />
                </svg>
              </td>
            </tr>
            <tr>
              <td>
                <!-- Horizontal Information -->
                <svg v-if="!solved" id="horizontalInformation" draggable="false" 
                     :width="horizontalWidth * cellWidth + 8" :height="height * cellWidth + 1">
                  <template v-for="(group, i) in horizontalInfo" :key="`group-${i}`">
                    <template v-for="(row, j) in group" :key="`row-${i}-${j}`">
                      <template v-for="(cell, k) in row" :key="`cell-${cell.id}`">
                        <g class="gridCell noSelect" :id="cell.id" @click="selectColor(cell.colorId)" :transform="`translate(${cellWidth * k}, ${cellWidth * j + i * 5 * cellWidth})`">
                          <rect :width="cellWidth" :height="cellWidth" :fill="cell.background" stroke="transparent" :data-x="k" :data-y="j" />
                          <text :x="cellWidth / 2" :y="cellWidth / 2" :fill="cell.color" dominant-baseline="middle" text-anchor="middle" :style="`font-size: ${fontSize}px;`">{{ cell.blockLength }}</text>
                        </g>
                      </template>
                      <rect :x="horizontalWidth * cellWidth" :y="cellWidth * (j + i * 5)" width="7" :height="cellWidth" :fill="indicatorColors[indicatorHorizontal[i * 5 + j]]" />
                    </template>
                  </template>
                  <rect width="100%" height="100%" fill="url(#grid)" style="pointer-events: none" />
                </svg>
              </td>
              <td>
                <!-- Main Grid -->
                <svg id="mainArea" draggable="false" :class="solved ? 'solved' : 'mainArea'"
                     :width="width * cellWidth + 1" :height="height * cellWidth + 1"
                     oncontextmenu="return false;"
                     @touchstart="touchDownEvent"
                     @touchmove="touchMoveEvent"
                     @touchend="touchEndEvent">
                  <template v-for="(groupRow, groupRowIndex) in mainArea" :key="`groupRow-${groupRowIndex}`">
                    <template v-for="(group, groupIndex) in groupRow" :key="`group-${groupRowIndex}-${groupIndex}`">
                      <template v-for="(row, rowIndex) in group" :key="`row-${groupRowIndex}-${groupIndex}-${rowIndex}`">
                        <g v-for="cell in row" :key="`cellMain${cell.id}`" :id="cell.id" class="gridCell noSelect" :transform="`translate(${cellWidth * cell.x}, ${cellWidth * cell.y})`">
                          <rect :width="cellWidth" :height="cellWidth" :data-x="cell.x" :data-y="cell.y" :fill="colors[gridState[cell.y * width + cell.x]]" stroke="transparent" :style="`line-height: ${cellWidth}px;`" @mousedown="cellMouseDown($event, cell.x, cell.y)" @mouseenter="cellMouseEnter($event, cell.x, cell.y)" />
                          <circle v-if="gridState[cell.y * width + cell.x] == colors.length - 1 && !solved" class="circlePath" :cx="cellWidth / 2" :cy="cellWidth / 2" r="3" />
                        </g>
                      </template>
                    </template>
                  </template>
                  <rect v-if="!solved" width="100%" height="100%" fill="url(#grid)" style="pointer-events: none" />
                </svg>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Rating Section -->
      <div v-if="!store.isUserLoggedIn" class="rating-message">
        Bitte loggen Sie sich ein, um das Rätsel zu bewerten.
      </div>
      <div v-else class="rating-section">
        <h3>Bewertung</h3>
        <b-rate v-model="rating" :max="rateMax" />
      </div>

      <!-- Success Message -->
      <div v-if="solved" class="status-section">
        <div v-if="alreadySolved" class="already-solved">
          Sie haben dieses Rätsel bereits gelöst.
        </div>
        <div v-else class="success-message">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          Rätsel erfolgreich gelöst!
        </div>
      </div>
    </div>

    <!-- Comments -->
    <CommentSystem :riddleType="'nonogram'" :riddleId="computedId"/>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from "@/store/store";
import { useOruga } from '@oruga-ui/oruga-next';
import UserService from '@/services/UserService';
import NonogramService from '@/services/NonogramService';
import NonogramRatingService from '@/services/NonogramRatingService';
import CommentSystem from '@/components/CommentSystem.vue';
import DifficultyIndicator from './DifficultyIndicator.vue';

export default {
  name: 'NonogramSolve',
  components: {
    CommentSystem,
    DifficultyIndicator
  },
  setup() {
    const route = useRoute();
    const store = useMainStore();
    const oruga = useOruga();

    const nonogram = ref({
      width: 0,
      height: 0,
      colors: ['#FFFFFF', '#FFFFFF'],
      solution: [],
    });
    const revertHistory = ref([]);
    const revertIndex = ref(0);
    const cellWidth = ref(25);
    const cellWidthBase = ref(25);
    const selectedColor = ref(0);
    const solved = ref(false);
    const startMouseDown = ref([0, 0]);
    const lastMouseOver = ref([0, 0]);
    const gridState = ref([]);
    const gridStateCopy = ref([]);
    const indicatorColors = ref(["#ff0000", "#00ff00"]);
    const indicatorHorizontal = ref([]);
    const indicatorVertical = ref([]);
    const darkColor = ref('#000000');
    const lightColor = ref('#ffffff');
    const fontSize = ref(18);
    const rateMax = ref(5);
    const rating = ref(null);
    const alreadySolved = ref(false);
    const loggedIn = ref(false);
    const isMouseDown = ref(false);
    const rightMouseButtonPressed = ref(false);

    const computedId = computed(() => route.params.id);
    const height = computed(() => nonogram.value.height);
    const width = computed(() => nonogram.value.width);
    const colors = computed(() => {
      const baseColors = [...nonogram.value.colors];
      baseColors.push('#FFFFFF');
      return baseColors;
    });
    const backgroundNumber = computed(() => colors.value.length - 2);
    const solution = computed(() => {
      const solution = nonogram.value.solution;
      const adaptedSolution = [];
      for (const row of solution) {
        const adaptedRow = [];
        for (let i = 0; i < row.length; i++) {
          if (row[i] == 0) {
            adaptedRow.push(colors.value.length - 2);
          } else {
            adaptedRow.push(row[i] - 1);
          }
        }
        adaptedSolution.push(adaptedRow);
      }
      return adaptedSolution;
    });
    const horizontalInfo = computed(() => {
      const horizontalInfo = [];
      let cellId = 0;
      let longestRow = 0;
      for (let a = 0; a < height.value; a += 5) {
        const infoGroup = [];
        for (let b = 0; b < 5; b += 1) {
          const i = a + b;
          if (i >= height.value) {
            break;
          }
          const rowInfo = [];
          let currentNumber = solution.value[i][0];
          let currentNumberCounter = 1;
          for (let j = 1; j < width.value; j++) {
            if (solution.value[i][j] != currentNumber) {
              if (currentNumber != backgroundNumber.value && currentNumber != colors.value.length - 1) {
                rowInfo.push({
                  'colorId': currentNumber,
                  'id': cellId,
                  'color': fontColors.value[currentNumber],
                  'blockLength': currentNumberCounter,
                  background: colors.value[currentNumber]
                });
                cellId += 1;
              }
              currentNumber = solution.value[i][j];
              currentNumberCounter = 1;
            } else {
              currentNumberCounter += 1;
            }
          }
          if (currentNumber != backgroundNumber.value && currentNumber != colors.value.length - 1) {
            rowInfo.push({
              'colorId': currentNumber,
              'id': cellId,
              'color': fontColors.value[currentNumber],
              'blockLength': currentNumberCounter,
              background: colors.value[currentNumber]
            });
            cellId += 1;
          }
          infoGroup.push(rowInfo);
          longestRow = Math.max(longestRow, rowInfo.length);
        }
        horizontalInfo.push(infoGroup);
      }
      for (const group of horizontalInfo) {
        for (const row of group) {
          for (let o = row.length; o < longestRow; o += 1) {
            row.unshift({
              'colorId': backgroundNumber.value,
              'color': '#fff',
              'id': cellId,
              blockLength: 0,
              background: '#fff'
            });
            cellId += 1;
          }
        }
      }
      return horizontalInfo;
    });
    const horizontalWidth = computed(() => {
      if (horizontalInfo.value[0] == null) return 0;
      return horizontalInfo.value[0][0].length;
    });
    const horizontalClues = computed(() => {
      const rowInfos = [];
      for (let b = 0; b < height.value; b++) {
        const rowInfo = [];
        let currentNumber = solution.value[b][0];
        let currentNumberCounter = 1;
        for (let a = 1; a < width.value; a++) {
          if (solution.value[b][a] != currentNumber) {
            if (currentNumber != backgroundNumber.value) {
              rowInfo.push({ currentNumber, currentNumberCounter });
            }
            currentNumber = solution.value[b][a];
            currentNumberCounter = 1;
          } else {
            currentNumberCounter += 1;
          }
        }
        if (currentNumber != backgroundNumber.value) {
          rowInfo.push({ currentNumber, currentNumberCounter });
        }
        rowInfos.push(rowInfo);
      }
      return rowInfos;
    });
    const verticalClues = computed(() => {
      const columnInfos = [];
      for (let b = 0; b < width.value; b++) {
        const columnInfo = [];
        let currentNumber = solution.value[0][b];
        let currentNumberCounter = 1;
        for (let a = 1; a < height.value; a++) {
          if (solution.value[a][b] != currentNumber) {
            if (currentNumber != backgroundNumber.value) {
              columnInfo.push({ currentNumber, currentNumberCounter });
            }
            currentNumber = solution.value[a][b];
            currentNumberCounter = 1;
          } else {
            currentNumberCounter += 1;
          }
        }
        if (currentNumber != backgroundNumber.value) {
          columnInfo.push({ currentNumber, currentNumberCounter });
        }
        columnInfos.push(columnInfo);
      }
      return columnInfos;
    });
    const verticalInfo = computed(() => {
      const verticalInfo = [];
      let cellId = 0;
      let longestColumn = 0;
      for (let a = 0; a < width.value; a += 5) {
        const infoGroup = [];
        for (let b = 0; b < 5; b += 1) {
          const i = a + b;
          if (i >= width.value) {
            break;
          }
          const columnInfo = [];
          let currentNumber = solution.value[0][i];
          let currentNumberCounter = 1;
          for (let j = 1; j < height.value; j += 1) {
            if (solution.value[j][i] != currentNumber) {
              if (currentNumber != backgroundNumber.value) {
                columnInfo.push({
                  'colorId': currentNumber,
                  'id': cellId,
                  'color': fontColors.value[currentNumber],
                  'blockLength': currentNumberCounter,
                  background: colors.value[currentNumber]
                });
                cellId += 1;
              }
              currentNumber = solution.value[j][i];
              currentNumberCounter = 1;
            } else {
              currentNumberCounter += 1;
            }
          }
          if (currentNumber != backgroundNumber.value) {
            columnInfo.push({
              'colorId': currentNumber,
              'id': cellId,
              'color': fontColors.value[currentNumber],
              'blockLength': currentNumberCounter,
              background: colors.value[currentNumber]
            });
            cellId += 1;
          }
          infoGroup.push(columnInfo);
          longestColumn = Math.max(longestColumn, columnInfo.length);
        }
        verticalInfo.push(infoGroup);
      }
      for (const group of verticalInfo) {
        for (const row of group) {
          for (let o = row.length; o < longestColumn; o += 1) {
            row.unshift({
              'colorId': backgroundNumber.value,
              'color': '#fff',
              'id': cellId,
              blockLength: 0,
              background: '#fff'
            });
            cellId += 1;
          }
        }
      }
      return verticalInfo;
    });
    const verticalHeight = computed(() => {
      if (verticalInfo.value[0] == null) return 0;
      return verticalInfo.value[0][0].length;
    });
    const mainArea = computed(() => {
      const mainArea = [];
      let cellId = 0;
      for (let i = 0; i < height.value; i += 5) {
        const gridGroupRow = [];
        for (let j = 0; j < width.value; j += 5) {
          const gridGroup = [];
          for (let k = i; k < Math.min(i + 5, height.value); k++) {
            const gridRow = [];
            for (let l = j; l < Math.min(j + 5, width.value); l++) {
              gridRow.push({
                'x': l, 'y': k, 'id': cellId
              });
              cellId += 1;
            }
            gridGroup.push(gridRow);
          }
          gridGroupRow.push(gridGroup);
        }
        mainArea.push(gridGroupRow);
      }
      return mainArea;
    });
    const fontColors = computed(() => {
      const fontColors = [];
      for (const color of colors.value) {
        fontColors.push(pickTextColorBasedOnBgColor(color));
      }
      return fontColors;
    });

    const fetchNonogram = async (id) => {
      const response = await NonogramService.show(id);
      nonogram.value = response.data;
      setRating(id);
      if (loggedIn.value) {
        await checkIfAlreadySolved();
      }
      gridState.value = new Array(width.value * height.value).fill(backgroundNumber.value);
      indicatorHorizontal.value = new Array(height.value).fill(0);
      indicatorVertical.value = new Array(width.value).fill(0);
      revertHistory.value = [[...gridState.value]];
      revertIndex.value = 0;
      checkTotalNonogram();
    };

    const setRating = async (nonogramId) => {
      try {
        if (loggedIn.value && store.user.value) {
          const res = await NonogramRatingService.show(nonogramId);
          rating.value = res.data.rating;
        } else {
          rating.value = null;
        }
      } catch (error) {
        console.error('Error setting rating:', error);
        rating.value = null;
      }
    };

    const checkIfAlreadySolved = async () => {
      try {
        console.log('Checking if already solved...')
        if (!store.user || !store.user.id) {
          console.log('No user data available')
          return
        }

        const response = await UserService.show(store.user.id)
        console.log('User data response:', response.data)
        
        if (response && response.data) {
          const userData = response.data
          const nonogramId = parseInt(route.params.id, 10)
          
          if (Array.isArray(userData.solvedNonograms)) {
            alreadySolved.value = userData.solvedNonograms.includes(nonogramId)
            console.log('Puzzle solved status:', alreadySolved.value)
          } else {
            console.log('No solvedNonograms array found')
            alreadySolved.value = false
          }
        } else {
          console.log('No response data')
          alreadySolved.value = false
        }
      } catch (error) {
        console.error('Error checking solved status:', error)
        alreadySolved.value = false
      }
    }

    const revertState = () => {
      if (revertIndex.value > 0) {
        revertIndex.value--;
        gridState.value = [...revertHistory.value[revertIndex.value]];
        checkTotalNonogram();
      }
    };

    const restoreState = () => {
      if (revertIndex.value < revertHistory.value.length - 1) {
        revertIndex.value++;
        gridState.value = [...revertHistory.value[revertIndex.value]];
        checkTotalNonogram();
      }
    };

    const saveSolvedState = async () => {
      try {
        if (!store.isUserLoggedIn) {
          console.log('User not logged in, skipping save')
          return
        }
        
        if (alreadySolved.value) {
          console.log('Puzzle already marked as solved')
          return
        }
        
        const userId = store.user.id
        const nonogramId = parseInt(route.params.id, 10)
        console.log('Saving solved state for user:', userId, 'nonogram:', nonogramId)
        
        await UserService.nonogramSolved(userId, nonogramId)
        
        alreadySolved.value = true
        oruga.notification.open({
          message: 'Rätsel erfolgreich als gelöst markiert!',
          duration: 3000,
          variant: 'success'
        })
        console.log('Solved state saved successfully')
      } catch (error) {
        console.error('Error updating solved puzzles:', error)
        oruga.notification.open({
          message: 'Fehler beim Speichern des Lösungsstatus',
          duration: 3000,
          variant: 'danger'
        })
      }
    };

    const zoomIn = () => {
      cellWidth.value = cellWidth.value + 5;
      fontSize.value += 3;
    };

    const zoomOut = () => {
      cellWidth.value = Math.max(cellWidth.value - 5, 15);
      fontSize.value = Math.max(fontSize.value - 3, 12);
    };

    const getLighting = (color) => {
      const colorInfo = color.substring(1);      // strip #
      const rgb = parseInt(colorInfo, 16);   // convert rrggbb to decimal
      const r = (rgb >> 16) & 0xff;  // extract red
      const g = (rgb >>  8) & 0xff;  // extract green
      const b = (rgb >>  0) & 0xff;  // extract blue
      return 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
    };

    const pickTextColorBasedOnBgColor = (bgColor) => {
      const color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
      const r = parseInt(color.substring(0, 2), 16); // hexToR
      const g = parseInt(color.substring(2, 4), 16); // hexToG
      const b = parseInt(color.substring(4, 6), 16); // hexToB
      const uicolors = [r / 255, g / 255, b / 255];
      const c = uicolors.map((col) => {
        if (col <= 0.03928) {
          return col / 12.92;
        }
        return Math.pow((col + 0.055) / 1.055, 2.4);
      });
      const L = (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
      return (L > 0.179) ? darkColor.value : lightColor.value;
    };

    const getSelectedColor = () => {
      return rightMouseButtonPressed.value ? backgroundNumber.value : selectedColor.value;
    };

    const getCellFromTouchPos = (e) => {
      const rect = document.getElementById("mainArea").getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      return [Math.floor(x / cellWidth.value), Math.floor(y / cellWidth.value)];
    };

    const touchDownEvent = (e) => {
      const [horizontalCellIndex, verticalCellIndex] = getCellFromTouchPos(e);
      cellMouseDown(e, horizontalCellIndex, verticalCellIndex);
    };

    const touchMoveEvent = (e) => {
      const [horizontalCellIndex, verticalCellIndex] = getCellFromTouchPos(e);
      cellMouseEnter(e, horizontalCellIndex, verticalCellIndex);
    };

    const touchEndEvent = () => {
      mainGridMouseUp();
    };

    const cellMouseDown = (e, i, j) => {
      if (!solved.value) {
        isMouseDown.value = true;
        startMouseDown.value = [i, j];
        lastMouseOver.value = startMouseDown.value;
        rightMouseButtonPressed.value = e.which == 3;
        gridStateCopy.value = [...gridState.value];
        gridState.value[j * width.value + i] = getSelectedColor();
      }
    };

    const cellMouseEnter = (e, i1, j1) => {
      if (isMouseDown.value) {
        const [i2, j2] = startMouseDown.value;
        const [i3, j3] = lastMouseOver.value;
        
        // Restore previous state from copy
        if (i1 !== i3) {
          for (let b = Math.min(i1, i3); b <= Math.max(i1, i3); b++) {
            for (let a = Math.min(j2, j3); a <= Math.max(j2, j3); a++) {
              gridState.value[a * width.value + b] = gridStateCopy.value[a * width.value + b];
            }
          }
        }
        if (j1 !== j3) {
          for (let b = Math.min(j1, j3); b <= Math.max(j1, j3); b++) {
            for (let a = Math.min(i2, i3); a <= Math.max(i2, i3); a++) {
              gridState.value[b * width.value + a] = gridStateCopy.value[b * width.value + a];
            }
          }
        }
        
        // Apply new state
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            gridState.value[b * width.value + a] = getSelectedColor();
          }
        }
        lastMouseOver.value = [i1, j1];
      }
    };

    const checkRow = (b) => {
      const rowInfo = horizontalClues.value[b];
      let checkIndex = 0;
      const startIndex = b * width.value;
      let currentNumber = gridState.value[startIndex];
      let currentNumberCounter = 1;

      for (let a = 1; a < width.value; a++) {
        if (gridState.value[startIndex + a] !== currentNumber) {
          if (currentNumber !== backgroundNumber.value && 
              currentNumber !== colors.value.length - 1) {
            if (checkIndex >= rowInfo.length || 
                currentNumber !== rowInfo[checkIndex].currentNumber || 
                currentNumberCounter !== rowInfo[checkIndex].currentNumberCounter) {
              return 0;
            }
            checkIndex += 1;
          }
          currentNumber = gridState.value[startIndex + a];
          currentNumberCounter = 1;
        } else {
          currentNumberCounter += 1;
        }
      }

      if (currentNumber !== backgroundNumber.value && 
          currentNumber !== colors.value.length - 1) {
        if (checkIndex >= rowInfo.length || 
            currentNumber !== rowInfo[checkIndex].currentNumber || 
            currentNumberCounter !== rowInfo[checkIndex].currentNumberCounter) {
          return 0;
        }
        checkIndex += 1;
      }

      return checkIndex === rowInfo.length ? 1 : 0;
    };

    const checkColumn = (b) => {
      const columnInfo = verticalClues.value[b];
      let checkIndex = 0;
      let currentNumber = gridState.value[b];
      let currentNumberCounter = 1;

      for (let a = 1; a < height.value; a++) {
        if (gridState.value[width.value * a + b] !== currentNumber) {
          if (currentNumber !== backgroundNumber.value && 
              currentNumber !== colors.value.length - 1) {
            if (checkIndex >= columnInfo.length || 
                currentNumber !== columnInfo[checkIndex].currentNumber || 
                currentNumberCounter !== columnInfo[checkIndex].currentNumberCounter) {
              return 0;
            }
            checkIndex += 1;
          }
          currentNumber = gridState.value[width.value * a + b];
          currentNumberCounter = 1;
        } else {
          currentNumberCounter += 1;
        }
      }

      if (currentNumber !== backgroundNumber.value && 
          currentNumber !== colors.value.length - 1) {
        if (checkIndex >= columnInfo.length || 
            currentNumber !== columnInfo[checkIndex].currentNumber || 
            currentNumberCounter !== columnInfo[checkIndex].currentNumberCounter) {
          return 0;
        }
        checkIndex += 1;
      }

      return checkIndex === columnInfo.length ? 1 : 0;
    };

    const mainGridMouseUp = () => {
      if (isMouseDown.value) {
        const [i1, j1] = startMouseDown.value;
        const [i2, j2] = lastMouseOver.value;

        // Save current state for undo/redo
        if (revertIndex.value < revertHistory.value.length - 1) {
          revertHistory.value = revertHistory.value.slice(0, revertIndex.value + 1);
        }
        revertHistory.value.push([...gridState.value]);
        revertIndex.value = revertHistory.value.length - 1;

        // Check affected rows and columns
        for (let b = Math.min(i1, i2); b <= Math.max(i1, i2); b++) {
          indicatorVertical.value[b] = checkColumn(b);
        }
        for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
          indicatorHorizontal.value[b] = checkRow(b);
        }

        // Check if puzzle is solved
        if (indicatorHorizontal.value.every(v => v === 1) && 
            indicatorVertical.value.every(v => v === 1)) {
          solved.value = true;
          if (!alreadySolved.value) {
            saveSolvedState();
          }
        }

        isMouseDown.value = false;
      }
    };

    const checkTotalNonogram = () => {
      for (let i = 0; i < width.value; i++) {
        indicatorVertical.value[i] = checkColumn(i);
      }
      for (let i = 0; i < height.value; i++) {
        indicatorHorizontal.value[i] = checkRow(i);
      }

      // Check if puzzle is solved
      if (indicatorHorizontal.value.every(v => v === 1) && 
          indicatorVertical.value.every(v => v === 1)) {
        solved.value = true;
        if (!alreadySolved.value) {
          saveSolvedState();
        }
      }
    };

    const selectColor = (colorId) => {
      selectedColor.value = colorId;
    };

    onMounted(async () => {
      await fetchNonogram(route.params.id);
      document.addEventListener("mouseup", mainGridMouseUp);
      window.ondragstart = () => false;
      window.onbeforeunload = () => "Möchten Sie die Seite wirklich verlassen. Nicht gespeicherte Rätsel sind für immer verloren!";
    });

    onBeforeUnmount(() => {
      document.removeEventListener("mouseup", mainGridMouseUp);
    });

    watch(route, (newRoute) => {
      fetchNonogram(newRoute.params.id);
    });

    watch(loggedIn, (newValue) => {
      if (newValue) {
        checkIfAlreadySolved();
        setRating(route.params.id);
      }
    });

    watch(rating, async (newRating) => {
      if (newRating != null && store.isUserLoggedIn) {
        try {
          await NonogramRatingService.post({
            NonogramId: parseInt(route.params.id, 10),
            rating: newRating,
          });
          oruga.notification.open({
            message: 'Bewertung gespeichert',
            duration: 3000,
            variant: 'success'
          });
        } catch (error) {
          console.error('Error updating rating:', error);
          oruga.notification.open({
            message: 'Fehler beim Speichern der Bewertung',
            duration: 3000,
            variant: 'danger'
          });
        }
      }
    });

    return {
      nonogram,
      revertHistory,
      revertIndex,
      cellWidth,
      cellWidthBase,
      selectedColor,
      solved,
      startMouseDown,
      lastMouseOver,
      gridState,
      gridStateCopy,
      indicatorColors,
      indicatorHorizontal,
      indicatorVertical,
      darkColor,
      lightColor,
      fontSize,
      rateMax,
      rating,
      alreadySolved,
      loggedIn,
      computedId,
      height,
      width,
      colors,
      backgroundNumber,
      solution,
      horizontalInfo,
      horizontalWidth,
      horizontalClues,
      verticalClues,
      verticalInfo,
      verticalHeight,
      mainArea,
      fontColors,
      isMouseDown,
      rightMouseButtonPressed,
      fetchNonogram,
      setRating,
      checkIfAlreadySolved,
      revertState,
      restoreState,
      zoomIn,
      zoomOut,
      getLighting,
      pickTextColorBasedOnBgColor,
      getSelectedColor,
      getCellFromTouchPos,
      touchDownEvent,
      touchMoveEvent,
      touchEndEvent,
      cellMouseDown,
      cellMouseEnter,
      mainGridMouseUp,
      checkTotalNonogram,
      saveSolvedState,
      selectColor,
      store
    };
  },
};
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

.control-panels {
  display: flex;
  gap: 20px;
  margin: 5px 0;
}

.control-card {
  background: white;
  border-radius: 12px;
  padding: 10px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 120px;
  border: 1px solid #dddddd;
}

.control-label {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 0 10px;
  font-size: 14px;
  color: #666;
  border-radius: 12px;
}

.color-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 5px;
}

.empty-cell-dot {
  width: 6px;
  height: 6px;
  background-color: #000;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.color-button {
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: scale(1.1);
  }

  &.active {
    border-color: #2196F3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
  }
}

.size-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 5px;
}

.size-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #e0e0e0;
    transform: scale(1.1);
  }

  ion-icon {
    font-size: 20px;
    color: #666;
  }
}

#nonoMainArea {
  user-select: none;
}

.nonoGrid {
  border-spacing: 0;
  border-collapse: collapse;
}

.mainArea {
  cursor: pointer;
  touch-action: none;
}

.rating-section {
  margin: 20px 0;
  padding-top: 20px;
  border-top: 1px solid #eee;

  h2 {
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

  .control-panels {
    flex-wrap: wrap;
  }
}
</style>
