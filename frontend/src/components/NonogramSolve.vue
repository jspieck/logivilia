<template>
  <div class="solvePage">
    <div class="puzzleContainer" draggable="false">
      <div id="puzzleHeader">
        <h1 class="puzzleTitle">{{ nonogram.name }}</h1>
        <span class="difficulty">{{ nonogram.difficulty }}/<strong>5</strong></span>
      </div>
      <div id="puzzle" class="puzzleBody">
        <div id="nonoArea">
          <button id="zoomIn" @click="zoomIn" class="nonoButton largerIcon">
            <ion-icon v-pre name="add" aria-label="Hineinzoomen"></ion-icon>
          </button>
          <button id="zoomOut" @click="zoomOut" class="nonoButton largerIcon">
            <ion-icon v-pre name="remove"></ion-icon>
          </button>
          <button id="revert" @click="revertState" class="nonoButton">
            <ion-icon class="rotate" v-pre name="refresh"></ion-icon>
          </button>
          <button id="restore" @click="restoreState" class="nonoButton">
            <ion-icon v-pre name="refresh"></ion-icon>
          </button>

          <svg id="colors" :height="cellWidthBase + 25" :width="colors.length * (cellWidthBase + 10) + 15">
            <g v-for="(color, i) in colors" :key="`color${i}`" :transform="`translate(${5 + i * (cellWidthBase + 10)}, 5)`">
              <rect :fill="color" stroke="black" :width="cellWidthBase" :height="cellWidthBase" @click="selectColor(i)" />
              <circle v-if="i == colors.length - 1" class="circlePath" :cx="cellWidthBase / 2" :cy="cellWidthBase / 2" r="3" />
              <rect v-if="selectedColor == i" fill="#f55656" :width="cellWidthBase" height="3" :y="cellWidthBase + 4" />
            </g>
          </svg>
          <div id="nonoMainArea">
            <table class="nonoGrid">
              <tr>
                <td></td>
                <td>
                  <svg v-if="!solved" id="verticalInformation" ref="verticalInformation" draggable="false" :height="verticalHeight * cellWidth + 8" :width="width * cellWidth + 1">
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
                        <g v-for="(cell, cellIndex) in row" :key="`cellCol${cell.id}`" :id="cell.id" :transform="`translate(${cellWidth * rowIndex + groupIndex * 5 * cellWidth}, ${cellWidth * cellIndex})`">
                          <rect :data-x="k" :data-y="j" :width="cellWidth" :height="cellWidth" :fill="cell.background" />
                          <text :x="cellWidth / 2" :y="cellWidth / 2" :fill="cell.color" dominant-baseline="middle" text-anchor="middle" :style="`font-size: ${fontSize}px;`">{{ cell.blockLength }}</text>
                        </g>
                        <rect :y="verticalHeight * cellWidth" :x="cellWidth * (rowIndex + groupIndex * 5)" :width="cellWidth" height="7" :fill="indicatorColors[indicatorVertical[groupIndex * 5 + rowIndex]]" />
                      </template>
                    </template>
                    <rect width="100%" height="100%" fill="url(#grid)" style="pointer-events: none" />
                  </svg>
                </td>
              </tr>
              <tr>
                <td>
                  <svg v-if="!solved" id="horizontalInformation" draggable="false" :width="horizontalWidth * cellWidth + 8" :height="height * cellWidth + 1">
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
                  <svg id="mainArea" draggable="false" :class="solved ? 'solved' : 'mainArea'" :width="width * cellWidth + 1" :height="height * cellWidth + 1" oncontextmenu="return false;" @touchstart="touchDownEvent" @touchmove="touchMoveEvent" @touchend="touchEndEvent">
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
      </div>
      <h2>Rätsel bewerten</h2>
      <b-rate v-if="loggedIn" v-model="rating" icon-pack="mdi" icon="star" :max="rateMax" :show-text="false" :rtl="false" :spaced="false" :disabled="false"></b-rate>
      <p v-if="!loggedIn">Um das Rätsel zu bewerten, müssen Sie sich einloggen.</p>
      <div id="checkSolutionBox">
        <img v-if="solved" class="checking" src="@/assets/haken.png" width="40" height="40" />
        <label v-if="solved" id="solved">Gratulation, dieses Rätsel ist gelöst!</label>
      </div>
      <div v-if="!solved && alreadySolved">Glückwunsch! Sie haben dieses Rätsel bereits gelöst.</div>
    </div>
  </div>
  <CommentSystem :riddleType="'nonogram'" :riddleId="computedId" />
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from "@/store/store";
import UserService from '@/services/UserService';
import NonogramService from '@/services/NonogramService';
import NonogramRatingService from '@/services/NonogramRatingService';
import CommentSystem from '@/components/CommentSystem';

export default {
  name: 'NonogramSolve',
  components: {
    CommentSystem,
  },
  setup() {
    const route = useRoute();
    const store = useMainStore();

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
      checkTotalNonogram();
    };

    const setRating = async (nonogramId) => {
      if (loggedIn.value && store.user.value) {
        const res = await NonogramRatingService.show(nonogramId);
        rating.value = res.data.rating;
      }
    };

    const checkIfAlreadySolved = async () => {
      const userData = (await UserService.show(store.user.value.id)).data;
      const nonogramId = parseInt(route.params.id, 10) - 1;
      alreadySolved.value = userData.solvedNonograms.includes(nonogramId);
    };

    const revertState = () => {
      if (revertIndex.value > 0) {
        const state = revertHistory.value[revertIndex.value - 1];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            gridState.value[a * width.value + b] = state['colorsBefore'][b - state['x0']][a - state['y0']];
          }
        }
        revertIndex.value -= 1;
      }
    };

    const restoreState = () => {
      if (revertIndex.value < revertHistory.value.length) {
        const state = revertHistory.value[revertIndex.value];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            gridState.value[a * width.value + b] = state['colorAfter'];
          }
        }
        revertIndex.value += 1;
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
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            gridState.value[b * width.value + a] = getSelectedColor();
          }
        }
        lastMouseOver.value = [i1, j1];
      }
    };

    const checkRow = (b) => {
      let rowInfo = horizontalClues.value[b];
      let checkIndex = 0;
      const startIndex = b * width.value;
      let currentNumber = gridState.value[startIndex];
      let currentNumberCounter = 1;
      for (let a = 1; a < width.value; a++) {
        if (gridState.value[startIndex + a] != currentNumber) {
          if (currentNumber != backgroundNumber.value && currentNumber != colors.value.length - 1) {
            if (checkIndex >= rowInfo.length || currentNumber != rowInfo[checkIndex].currentNumber || currentNumberCounter != rowInfo[checkIndex].currentNumberCounter) {
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
      if (currentNumber != backgroundNumber.value && currentNumber != colors.value.length - 1) {
        if (checkIndex >= rowInfo.length || currentNumber != rowInfo[checkIndex].currentNumber || currentNumberCounter != rowInfo[checkIndex].currentNumberCounter) {
          return 0;
        }
        checkIndex += 1;
      }
      if (checkIndex != rowInfo.length) {
        return 0;
      }
      return 1;
    };

    const checkColumn = (b) => {
      let columnInfo = verticalClues.value[b];
      let checkIndex = 0;
      let currentNumber = gridState.value[b];
      let currentNumberCounter = 1;
      for (let a = 1; a < height.value; a++) {
        if (gridState.value[width.value * a + b] != currentNumber) {
          if (currentNumber != backgroundNumber.value && currentNumber != colors.value.length - 1) {
            if (checkIndex >= columnInfo.length || currentNumber != columnInfo[checkIndex].currentNumber || currentNumberCounter != columnInfo[checkIndex].currentNumberCounter) {
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
      if (currentNumber != backgroundNumber.value && currentNumber != colors.value.length - 1) {
        if (checkIndex >= columnInfo.length || currentNumber != columnInfo[checkIndex].currentNumber || currentNumberCounter != columnInfo[checkIndex].currentNumberCounter) {
          return 0;
        }
        checkIndex += 1;
      }
      if (checkIndex != columnInfo.length) {
        return 0;
      }
      return 1;
    };

    const mainGridMouseUp = () => {
      if (isMouseDown.value) {
        const [i1, j1] = startMouseDown.value;
        const [i2, j2] = lastMouseOver.value;
        const stateBefore = [];
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          const stateBeforeRow = [];
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            stateBeforeRow.push(gridStateCopy.value[b * width.value + a]);
            gridState.value[b * width.value + a] = getSelectedColor();
          }
          stateBefore.push(stateBeforeRow);
        }
        const revertObj = {
          'x0': Math.min(i1, i2),
          'x1': Math.max(i1, i2),
          'y0': Math.min(j1, j2),
          'y1': Math.max(j1, j2),
          'colorAfter': getSelectedColor(),
          'colorsBefore': stateBefore
        };

        if (revertIndex.value < revertHistory.value.length) {
          revertHistory.value[revertIndex.value] = revertObj;
          revertHistory.value.length = revertIndex.value + 1;
        } else {
          revertHistory.value.push(revertObj);
        }
        revertIndex.value += 1;

        for (let b = Math.min(i1, i2); b <= Math.max(i1, i2); b++) {
          indicatorVertical.value[b] = checkColumn(b);
        }
        for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
          indicatorHorizontal.value[b] = checkRow(b);
        }
        if (indicatorHorizontal.value.every(v => v === 1) && indicatorVertical.value.every(v => v === 1)) {
          solved.value = true;
          zoomIn();
          if (!alreadySolved.value) {
            saveSolvedNonogram();
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
    };

    const saveSolvedNonogram = async () => {
      if (loggedIn.value) {
        const userId = store.user.value.id;
        const nonogramId = parseInt(route.params.id, 10) - 1;
        const isSuccess = await UserService.nonogramSolved(userId, nonogramId);
        console.log("Suc", isSuccess);
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
      if (newRating != null) {
        try {
          await NonogramRatingService.post({
            NonogramId: parseInt(route.params.id, 10),
            rating: newRating,
          });
        } catch (err) {
          console.log(err);
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
      saveSolvedNonogram,
      selectColor,
    };
  },
};
</script>

<style lang="scss">
#solutionGrid {
  margin: 30px 0;
}

.crossPath, .circlePath {
  pointer-events: none;
}

.verticalTextGroup text {
  writing-mode: tb;
}

.blockGroups {
  pointer-events: all;
}

.correctRow {
  background: red;
  width: 5px;
  display: inline-block;
  vertical-align: top;
}

.correctColumn {
  background: red;
  height: 5px;
}

#buttonBar {
  border: 1px solid #dbdde0;
  display: inline-block;
  padding: 10px;
  border-radius: 8px;
}

#nonoArea {
  margin: 0;
  margin-bottom: 20px;
}

#mainArea .gridRow .gridCell:last-child {
  border-right: none;
}

.noSelect {
  user-select: none;
}

.gridCell {
  display: inline-block;
  vertical-align: top;
  border-right: 1px solid #d7dadd;
  text-align: center;
  line-height: 25px;
  font-size: 18px;
  color: #111111;
}

.gridGroup .gridRow {
  border-top: 1px solid #d7dadd;
}

.gridGroup .gridRow:first-child {
  border-top: none;
}

.gridGroup .gridColumn {
  border-right: 1px solid #d7dadd;
}

.gridGroup .gridColumn:last-child {
  border-right: none;
}

.rotate {
  transform: scaleX(-1);
}

.gridCellVert {
  display: block;
  border-bottom: 1px solid #d7dadd;
  text-align: center;
  line-height: 25px;
  font-size: 18px;
  color: #111111;
}

.gridColumn {
  display: inline-block;
}

.gridGroup .gridColumn .gridCellVert:first-child {
  border-top: none;
}

.gridGroup .gridColumn:last-child .gridCellVert {
  border-right: none;
}

.gridRow .gridGroup:last-child {
  border-right: 2px solid #222222;
}

.gridRow:last-child .gridGroup {
  border-bottom: 2px solid #222222;
}

.gridGroup {
  display: inline-block;
  border-top: 2px solid #222222;
  border-left: 2px solid #222222;
}

.solved .gridCell, .solved .gridGroup .gridRow, .solved .gridGroup .gridColumn, .solved .gridGroup, .solved .gridRow:last-child .gridGroup, .solved .gridRow .gridGroup:last-child  {
  border: none;
}

ion-icon {
  pointer-events: none;
}

.nonoGrid {
  border: none;
}

.bold {
  font-weight: bold;
}

input {
  padding: 9px;
  box-sizing: border-box;
  height: 30px;
}

.nonoButton {
  display: inline-block;
  font-size: 21px;
  color: black;
  padding: 2px;
  width: 35px;
  height: 35px;
  line-height: 35px;
  position: relative;
  text-align: center;
  border: none;
  cursor: pointer;
  vertical-align: top;
  margin-right: 20px;
  outline: none;
  border-radius: 50%;
}

.nonoButton:last-child {
  margin-right: 0;
}

.largerIcon {
  font-size: 28px;
}

.checking {
  display: inline-block;
  vertical-align: middle;
  margin-left: 10px;
}

ul {
  margin-block-start: 5px;
}

#verticalInformation {
  display: block;
  margin-bottom: 3px;
}

#horizontalInformation {
  display: block;
  margin-right: 3px;
}
</style>
