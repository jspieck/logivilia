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
      <div id="nonoArea">
        <!-- Warning Banner -->
        <b-notification type="is-warning" role="alert">
          Dieser Rätseltyp befindet sich noch in der Testphase. Es kann zu Fehlern kommen.
        </b-notification>

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
        </div>

        <!-- Main Grid Area - Keeping original functionality intact -->
        <div id="linelogGridContainer">
          <svg id="mainArea" draggable="false" :class="solved ? 'solved' : 'mainArea'" :width="width * cellWidth + 1" :height="height * cellWidth + 1"
            @mousedown="e => {mouseDown(e)}" @mousemove="e => {mouseMove(e)}" @touchstart="e => {touchDown(e)}" @touchmove="e => {touchMove(e)}">
            <!-- Keep all original SVG content exactly as is -->
            <defs>
              <pattern id="smallGrid" :width="cellWidth" :height="cellWidth" patternUnits="userSpaceOnUse">
                <path :d="`M ${cellWidth} 0 L 0 0 0 ${cellWidth}`" fill="none" stroke="#929292" stroke-width="1"/>
              </pattern>
              <pattern id="grid" :width="cellWidth * 5" :height="cellWidth * 5" patternUnits="userSpaceOnUse">
                <rect :width="cellWidth * 5" :height="cellWidth * 5" fill="url(#smallGrid)"/>
                <path :d="`M ${cellWidth * 5} 0 L 0 0 0 ${cellWidth * 5}`" fill="none" stroke="black" stroke-width="2"/>
              </pattern>
            </defs>
            <rect v-if="!solved" width="100%" height="100%" fill="url(#grid)" style="pointer-events: none" />
            <path v-for="path in paths" v-bind:key="`path${path.id}`" class="linelogNoSelect" :d="createPath(path.cells)" :stroke-width="strokeWidth" fill="none" stroke-linejoin="round" :stroke="colors[path.color]"/>
            <path v-if="currentPath != null" v-bind:key="`currentpath`" class="linelogNoSelect" :d="createPath(currentPath.cells)" :stroke-width="strokeWidth" fill="none" stroke-linejoin="round" :stroke="colors[currentPath.color]"/>
            <template v-for="[y, infoRow] in information.entries()">
              <g v-for="[x, cell] in infoRow.entries()" v-bind:key="`cellMain${y}_${x}`" class="gridCell linelogNoSelect" :transform="`translate(${cellWidth * x}, ${cellWidth * y})`">
                <rect v-if="solved" :width="cellWidth" :height="cellWidth" :fill="colors[gridState[x + width * y]]"/>
                <circle v-if="cell != 0" :cx="cellWidth / 2" :cy="cellWidth / 2" :r="cellWidth * 0.4" :fill="colors[gridState[y * width + x]]"/>
                <text v-if="!solved && cell != 0" :x="cellWidth / 2" :y="cellWidth / 2" :fill="fontColors[gridState[y * width + x]]" dominant-baseline="middle" text-anchor="middle" :style="`font-size: ${fontSize}px;`">{{cell}}</text>
              </g>
            </template>
          </svg>
        </div>
      </div>

      <!-- Rating Section -->
      <div class="rating-section">
        <h2>Rätsel bewerten</h2>
        <b-rate
          v-if="loggedIn"
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
      </div>

      <!-- Success Message -->
      <div class="status-section">
        <div v-if="solved" class="success-message">
          <img class="checking" src='@/assets/haken.png' width='40' height='40'/>
          <label id="solved">Gratulation! Sie haben dieses Rätsel gelöst!</label>
        </div>
        <div v-if="!solved && alreadySolved" class="already-solved">
          Glückwunsch! Sie haben dieses Rätsel bereits gelöst.
        </div>
      </div>
    </div>

    <!-- Comments -->
    <CommentSystem :riddleType="'linelog'" :riddleId="computedId"/>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute } from "vue-router";
import { useMainStore } from "@/store/store";
import { useOruga } from '@oruga-ui/oruga-next'

import LinelogService from "@/services/LinelogService";
import LinelogRatingService from "@/services/LinelogRatingService";
import UserService from "@/services/UserService";
import CommentSystem from "@/components/CommentSystem.vue";
import DifficultyIndicator from './DifficultyIndicator.vue'


const oruga = useOruga();

const route = useRoute();
const store = useMainStore();

const cellWidth = ref(25);
const cellWidthBase = ref(25);
const selectedColor = ref(0);
const solved = ref(false);
const isMouseDown = ref(false);
const gridState = ref([]);
const lastMousePos = ref([]);
const lastSetCell = ref([]);
const paths = ref({});
const pathIndex = ref(0);
const currentPath = ref(null);
const darkColor = ref("#000000");
const lightColor = ref("#ffffff");
const strokeWidth = ref(11);
const notificationActive = ref(false);
const fontSize = ref(14);
const pathIndices = ref([]);
const cellMarkDisabled = ref(false);
const originalCells = ref([]);
const rateMax = ref(5);
const rating = ref(null);
const alreadySolved = ref(false);
const linelog = ref({
  name: "",
  difficulty: 1,
  width: 0,
  height: 0,
  information: [],
  solution: [],
  colors: ["#FFFFFF"],
});

const checkIfAlreadySolved = async () => {
  try {
    console.log('Current user:', store.user)
    if (!store.user || !store.user.id) {
      console.log('No user data available')
      return
    }

    // Get fresh user data
    const response = await UserService.show(store.user.id)
    console.log('API Response:', response)
    
    if (response && response.data) {
      console.log('User data from API:', response.data)
      const userData = response.data
      const linelogId = parseInt(route.params.id, 10)
      
      if (Array.isArray(userData.solvedLinelogs)) {
        alreadySolved.value = userData.solvedLinelogs.includes(linelogId)
        console.log('Solved status:', alreadySolved.value)
      } else {
        console.log('No solvedLinelogs array found:', userData)
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
};

watch(
  () => route.params.id,
  async (newId) => {
    try {
      // Reset state variables first
      gridState.value = [];
      paths.value = {};
      pathIndex.value = 0;
      currentPath.value = null;
      solved.value = false;
      
      // Load riddle data regardless of login status
      const response = await LinelogService.show(newId)
      linelog.value = response.data
      
      // Initialize grid state AFTER data is loaded
      gridState.value = new Array(width.value * height.value).fill(
        backgroundNumber.value
      )
      
      pathIndices.value = new Array(width.value * height.value).fill(-1);
      
      // Initialize grid state with information cells
      for (let y = 0; y < information.value.length; y++) {
        for (let x = 0; x < information.value[y].length; x++) {
          if (information.value[y][x] != 0) {
            gridState.value[x + y * width.value] = solution.value[y][x];
          }
        }
      }

      // Check user-specific data only if logged in
      if (store.isUserLoggedIn && store.user) {
        try {
          await setRating(newId)
        } catch (error) {
          console.error('Error setting rating:', error)
        }
        
        try {
          await checkIfAlreadySolved()
        } catch (error) {
          console.error('Error checking solved status:', error)
          alreadySolved.value = false
        }
      }
    } catch (error) {
      console.error('Error loading linelog:', error)
      oruga.notification.open({
        duration: 5000,
        message: 'Fehler beim Laden des Rätsels. Bitte versuchen Sie es später erneut.',
        position: "top-right",
        closable: true,
        variant: "danger",
      });
    }
  },
  { immediate: true }
)

watch(
  () => store.user,
  async (newUser) => {
    if (newUser && store.isUserLoggedIn && route.params.id) {
      await checkIfAlreadySolved()
      await setRating(route.params.id)
    }
  },
  { immediate: true }
)

watch(() => store.isUserLoggedIn, async (newValue) => {
  if (newValue) {
    await checkIfAlreadySolved();
    await setRating(route.params.id);
  }
});

watch(rating, async (newRating) => {
  if (newRating != null) {
    try {
      await LinelogRatingService.post({
        LinelogId: parseInt(route.params.id, 10),
        rating: newRating,
      });
    } catch (err) {
      console.error("Error posting rating:", err);
      oruga.notification.open({
        duration: 3000,
        message: 'Bewertung konnte nicht gespeichert werden.',
        position: "top-right",
        closable: true,
        variant: "danger",
      });
    }
  }
});

const loggedIn = computed(() => store.isUserLoggedIn);
const computedId = computed(() => route.params.id);
const height = computed(() => linelog.value.height);
const width = computed(() => linelog.value.width);
const colors = computed(() => linelog.value.colors);
const backgroundNumber = computed(() => colors.value.length - 1);
const information = computed(() => {
  const information = [];
  // create a copy
  for (const row of linelog.value.information) {
    const infoRow = [];
    for (const cell of row) {
      infoRow.push(cell);
    }
    information.push(infoRow);
  }
  return information;
});

const solution = computed(() => {
  const solution = [];
  // create a copy
  for (const row of linelog.value.solution) {
    const solutionRow = [];
    for (const cell of row) {
      if (cell == 0) {
        solutionRow.push(backgroundNumber.value);
      } else {
        solutionRow.push(cell - 1);
      }
    }
    solution.push(solutionRow);
  }
  return solution;
});

const fontColors = computed(() => {
  const fontColors = [];
  for (const color of colors.value) {
    fontColors.push(pickTextColorBasedOnBgColor(color));
  }
  console.log(fontColors);
  return fontColors;
});

onMounted(async () => {
  const id = route.params.id;
  linelog.value = (await LinelogService.show(id)).data;
  setRating(id);

  gridState.value = new Array(width.value * height.value).fill(
    backgroundNumber.value
  );
  pathIndices.value = new Array(width.value * height.value).fill(-1);
  for (let y = 0; y < information.value.length; y++) {
    for (let x = 0; x < information.value[y].length; x++) {
      if (information.value[y][x] != 0) {
        gridState.value[x + y * width.value] = solution.value[y][x];
      }
    }
  }
  if (store.isUserLoggedIn) {
    checkIfAlreadySolved();
  }

  document.addEventListener("mouseup", mainGridMouseUp);
  document.addEventListener("touchend", mainGridMouseUp);
  window.ondragstart = () => false;
  window.onbeforeunload = () =>
    "Möchten Sie die Seite wirklich verlassen. Nicht gespeicherte Rätsel sind für immer verloren!";
});

onBeforeUnmount(() => {
  document.removeEventListener("mouseup", mainGridMouseUp);
  document.removeEventListener("touchend", mainGridMouseUp);
});

const scaleToScreenSize = () => {
  const MAX_WIDTH = 500;
  const PADDING = 50;
  const targetedWidth = Math.min(
    Math.max(PADDING, window.screen.width - PADDING),
    MAX_WIDTH
  );
  cellWidth.value = targetedWidth / linelog.value.width;
};

const setRating = async (logicalId) => {
  if (store.user != null) {
    try {
      const res = await LinelogRatingService.show(logicalId);
      rating.value = res.data.rating;
    } catch (error) {
      console.error("Error fetching rating:", error);
      // Set a default rating or leave as null
      rating.value = null;
    }
  }
};
const showZoomLevel = () => {
  oruga.notification.open({
    duration: 1000,
    message: `Zoom: ${Math.round(
      (cellWidth.value / cellWidthBase.value) * 100
    )} %`,
    position: "top-right",
    closable: false,
    variant: "info",
    queue: true,
  });
};
const errorMessage = (text) => {
  if (!solved.value) {
    oruga.notification.open({
      duration: 1000,
      message: text,
      position: "top-right",
      queue: false,
      closable: false,
      variant: "danger",
    });
  }
};

const zoomIn = () => {
  cellWidth.value = cellWidth.value + 5;
  fontSize.value += 3;
  strokeWidth.value += 2;
  notificationActive.value = true;
  showZoomLevel();
};

const zoomOut = () => {
  cellWidth.value = Math.max(cellWidth.value - 5, 15);
  fontSize.value = Math.max(fontSize.value - 3, 12);
  strokeWidth.value = Math.max(strokeWidth.value - 2, 7);
  notificationActive.value = true;
  showZoomLevel();
};

const selectColor = (colorId) => {
  selectedColor.value = colorId;
};
const pickTextColorBasedOnBgColor = (bgColor) => {
  const color = bgColor.charAt(0) === "#" ? bgColor.substring(1, 7) : bgColor;
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
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return L > 0.179 ? darkColor.value : lightColor.value;
};
const createPath = (cells) => {
  // can be made faster by array join :)
  let path = `M${(cells[0][0] + 0.5) * cellWidth.value} ${
    (cells[0][1] + 0.5) * cellWidth.value
  }`;
  for (let i = 1; i < cells.length; i++) {
    path += `L${(cells[i][0] + 0.5) * cellWidth.value} ${
      (cells[i][1] + 0.5) * cellWidth.value
    }`;
  }
  return path;
};
const getCellFromTouchPos = (e) => {
  const rect = e.target.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  const y = e.touches[0].clientY - rect.top;
  // console.log(x, y);
  return [Math.floor(x / cellWidth.value), Math.floor(y / cellWidth.value)];
};
const getCellFromMousePos = (e) => {
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  // console.log(x, y);
  return [Math.floor(x / cellWidth.value), Math.floor(y / cellWidth.value)];
};
const touchDown = (e) => {
  const [x, y] = getCellFromTouchPos(e);
  downEvent(x, y);
};
const mouseDown = (e) => {
  const [x, y] = getCellFromMousePos(e);
  downEvent(x, y);
};
const downEvent = (x, y) => {
  const pathIndex = pathIndices.value[y * width.value + x];
  const [x0, y0] = pathIndex == -1 ? [0, 0] : paths.value[pathIndex].cells[0];
  const [x1, y1] =
    pathIndex == -1
      ? [0, 0]
      : paths.value[pathIndex].cells[paths.value[pathIndex].cells.length - 1];
  const correctLength =
    pathIndex == -1 ? information.value[y][x] : paths.value[pathIndex].correctLength;

  // allow only the information cell if path already completed
  if (
    pathIndex != -1 &&
    information.value[y][x] != 0 &&
    (information.value[y0][x0] == 0 || information.value[y1][x1] == 0)
  ) {
    return;
  }
  // we cannot start on a path in the middle of a path
  if (pathIndex == -1 || (x0 == x && y0 == y) || (x1 == x && y1 == y)) {
    // && information[y][x] == 0
    isMouseDown.value = true;
    lastMousePos.value = [x, y];
    lastSetCell.value = [x, y];
    const color = gridState.value[x + width.value * y];
    currentPath.value = {
      id: pathIndex,
      color: color,
      correctLength: correctLength,
      cells: [[x, y]],
    };
    selectedColor.value = color;
    // if our starting cell belongs to another path, add this path to the beginning of the new path
    originalCells.value = [];
    if (pathIndex != -1 && ((x0 == x && y0 == y) || (x1 == x && y1 == y))) {
      // console.log(x0, y0, x1, y1, x, y);
      // reverse path if we start on an information cell from the wrong direction
      if (information.value[y][x] != 0) {
        if (x0 == x && y0 == y) {
          paths.value[pathIndex].cells = paths.value[pathIndex].cells.reverse();
          // console.log("Cells reversed");
        }
        // unmark path indices at the middle of the path
        for (const [x, y] of paths.value[pathIndex].cells) {
          pathIndices.value[y * width.value + x] = -1;
        }
      }
      const cells = [];
      for (const cell of paths.value[pathIndex].cells) {
        cells.push(cell);
      }
      originalCells.value = cells;
      currentPath.value.cells = paths.value[pathIndex].cells;
      // delete old path if it is replaced
      if (information.value[y][x] != 0) {
        delete paths.value[pathIndex];
      }
      // console.log(currentPath.cells);
    }
  }
};
const touchMove = (e) => {
  if (isMouseDown.value) {
    const [x, y] = getCellFromTouchPos(e);
    moveEvent(x, y);
  }
};
const mouseMove = (e) => {
  if (isMouseDown.value) {
    const [x, y] = getCellFromMousePos(e);
    moveEvent(x, y);
  }
};
const moveEvent = (x, y) => {
  if (solved.value) return;
  if (x < 0 || y < 0 || x >= width.value || y >= height.value) return;
  if (x != lastMousePos.value[0] || y != lastMousePos.value[1]) {
    // do nothing if already on path; except if second last, delete last cell
    let count = 0;
    for (const [xa, ya] of currentPath.value.cells) {
      if (x == xa && y == ya) {
        if (count == currentPath.value.cells.length - 2) {
          currentPath.value.cells.pop();
          lastSetCell.value = [x, y];
          lastMousePos.value = [x, y];
          cellMarkDisabled.value = false;
        }
        return;
      }
      count += 1;
    }
    const cellColor = gridState.value[y * width.value + x];
    const pathIndex = pathIndices.value[y * width.value + x];
    // empty field or start/ end of another path
    const [x0, y0] = pathIndex == -1 ? [0, 0] : paths.value[pathIndex].cells[0];
    const [x1, y1] =
      pathIndex == -1
        ? [0, 0]
        : paths.value[pathIndex].cells[paths.value[pathIndex].cells.length - 1];
    const correctLength =
      pathIndex == -1 ? information.value[y][x] : paths.value[pathIndex].correctLength;
    let cellReachable = true;
    if (cellMarkDisabled.value) {
      errorMessage("Pfad schon komplett");
      cellReachable = false;
    }
    // if end box, only if same color and same number (TODO) and unused
    if (
      cellReachable &&
      information.value[y][x] != 0 &&
      selectedColor.value != solution.value[y][x]
    ) {
      errorMessage("Falsche Farbe");
      cellReachable = false;
    }
    // TODO also do for paths that are connecting
    if (
      cellReachable &&
      currentPath.value.cells.length + 1 > currentPath.value.correctLength
    ) {
      errorMessage("Zu langer Pfad");
      cellReachable = false;
    }
    if (
      cellReachable &&
      information.value[y][x] != 0 &&
      (correctLength != currentPath.value.correctLength ||
        correctLength - 1 != currentPath.value.cells.length)
    ) {
      errorMessage("Unterschiedliche Pfadlänge");
      cellReachable = false;
    }
    // cell mustn't be of another color and if has to be the end or start of another path
    if (
      cellReachable &&
      cellColor != backgroundNumber.value &&
      cellColor != selectedColor.value
    ) {
      errorMessage("Feld anders gefärbt");
      cellReachable = false;
    }
    if (
      cellReachable &&
      cellColor != backgroundNumber.value &&
      pathIndex != -1 &&
      !(x == x0 && y == y0) &&
      !(x == x1 && y == y1)
    ) {
      errorMessage("Feld in der Mitte eines anderen Pfades");
      cellReachable = false;
    }
    if (
      cellReachable &&
      cellColor != backgroundNumber.value &&
      pathIndex != -1 &&
      ((x == x0 && y == y0) || (x == x1 && y == y1))
    ) {
      // check if paths can be merged
      const mergeLength =
        currentPath.value.cells.length + paths.value[pathIndex].cells.length;
      if (mergeLength != currentPath.value.correctLength) {
        errorMessage("Falsche Länge des kombinierten Pfads");
        cellReachable = false;
      } else {
        cellMarkDisabled.value = true;
      }
    }
    if (cellReachable) {
      // console.log([x, y], currentPath.cells);
      // if not one position horizontal/vertical do nothing
      if (
        Math.abs(x - lastSetCell.value[0]) +
          Math.abs(y - lastSetCell.value[1]) ==
        1
      ) {
        // add current field to path
        currentPath.value.cells.push([x, y]);
        lastSetCell.value = [x, y];
      }
    }
  }
  lastMousePos.value = [x, y];
};
const checkIfSolved = () => {
  let solved = true;
  for (let y = 0; y < solution.value.length; y++) {
    for (let x = 0; x < solution.value[y].length; x++) {
      // check that twos are connected
      if (
        (information.value[y][x] > 1 && pathIndices.value[y * width.value + x] == -1) ||
        solution.value[y][x] != gridState.value[y * width.value + x]
      ) {
        solved = false;
        break;
      }
    }
  }
  solved = solved.value;
  if (solved) {
    scaleToScreenSize();
  }
  if (!alreadySolved.value && solved) {
    saveSolvedLinelog();
  }
};
const saveSolvedLinelog = async () => {
  if (store.isUserLoggedIn) {
    try {
      const userId = store.user.id;
      const linelogId = parseInt(route.params.id, 10);
      const isSuccess = await UserService.linelogSolved(userId, linelogId);
      console.log("Puzzle saved as solved:", isSuccess);
    } catch (error) {
      console.error("Error saving solved status:", error);
    }
  }
};
const setPathIndices = (cells, pathIndex) => {
  for (const [x, y] of cells) {
    pathIndices.value[y * width.value + x] = pathIndex;
  }
};
const mainGridMouseUp = () => {
  cellMarkDisabled.value = false;
  if (isMouseDown.value) {
    if (currentPath.value != null) {
      // check if overlap with other paths exists
      const [x0, y0] = currentPath.value.cells[0];
      const pathIndex0 = pathIndices.value[y0 * width.value + x0];
      const [x1, y1] =
        currentPath.value.cells[currentPath.value.cells.length - 1];
      const pathIndex1 = pathIndices.value[y1 * width.value + x1];
      /* if (pathIndex0 != -1) {

        // append to old path (minus overlapping cell)
        for (let i = 1; i < currentPath.cells.length; i++) {
          paths[pathIndex0].cells.push(currentPath.cells[i]);
        }
        setPathIndices(paths[pathIndex0].cells, pathIndex0);
      } */
      // clear cells of old path
      for (const [x, y] of originalCells.value) {
        if (information.value[y][x] == 0) {
          gridState.value[y * width.value + x] = backgroundNumber.value;
        }
        pathIndices.value[y * width.value + x] = -1;
      }
      originalCells.value = [];
      if (currentPath.value.cells.length > 1) {
        if (pathIndex1 != -1 && pathIndex0 != pathIndex1) {
          // append to old path (minus overlapping cell)
          for (let i = currentPath.value.cells.length - 2; i >= 0; i--) {
            paths.value[pathIndex1].cells.push(currentPath.value.cells[i]);
          }
          setPathIndices(paths.value[pathIndex1].cells, pathIndex1);
        } else {
          // add new path to paths
          setPathIndices(currentPath.value.cells, pathIndex.value);
          paths.value[pathIndex.value] = currentPath.value;
          pathIndex.value += 1;
        }
        // console.log(pathIndex1, pathIndex0, currentPath.cells);
        for (const [x, y] of currentPath.value.cells) {
          gridState.value[y * width.value + x] = currentPath.value.color;
        }
      }
      if (pathIndex0 != -1) {
        delete paths.value[pathIndex0];
      }
    }
    currentPath.value = null;
    isMouseDown.value = false;
    // check if solved
    checkIfSolved();
  }
};

// Add a watch for gridState
watch(gridState, (newState) => {
  if (!solved.value) {
    checkSolution(newState);
  }
}, { deep: true });

const checkSolution = (state) => {
  if (!state || !solution.value) return;
  
  let isCorrect = true;
  for (let y = 0; y < height.value; y++) {
    for (let x = 0; x < width.value; x++) {
      if (state[x + y * width.value] !== solution.value[y][x]) {
        isCorrect = false;
        break;
      }
    }
    if (!isCorrect) break;
  }

  if (isCorrect) {
    solved.value = true;
    if (store.isUserLoggedIn) {
      try {
        UserService.linelogSolved(store.user.id, parseInt(route.params.id, 10));
      } catch (err) {
        console.error("Error updating solved puzzles:", err);
      }
    }
  }
};

// Add a watch for the linelog data to ensure grid is properly initialized
watch(
  () => linelog.value,
  (newLinelog) => {
    if (newLinelog && newLinelog.width && newLinelog.height) {
      // Re-initialize grid state when linelog data changes
      gridState.value = new Array(width.value * height.value).fill(
        backgroundNumber.value
      );
      
      pathIndices.value = new Array(width.value * height.value).fill(-1);
      
      // Initialize grid state with information cells
      for (let y = 0; y < information.value.length; y++) {
        for (let x = 0; x < information.value[y].length; x++) {
          if (information.value[y][x] != 0) {
            gridState.value[x + y * width.value] = solution.value[y][x];
          }
        }
      }
    }
  },
  { deep: true }
)
</script>

<style lang="scss" scoped>
.color-buttons {
  display: flex;
  gap: 8px;
}

.color-button {
  width: 32px;
  height: 32px;
  margin-top: 2px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;

  &.active {
    border-color: #000;
  }

  &:hover {
    transform: scale(1.1);
  }
}

.puzzle-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
}

.puzzle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.puzzle-title {
  margin: 0;
  font-size: 1.5rem;
}

.puzzle-body {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.puzzle-controls {
  display: flex;
  gap: 10px;
  margin: 10px 0;
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
}

#mainArea {
  display: block;
  touch-action: none;
  overflow-x: scroll;
}

.linelogNoSelect {
  user-select: none;
  pointer-events: none;
}

#linelogGridContainer {
  overflow-x: scroll;
  margin: 20px 0;
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

::-webkit-scrollbar {
  -webkit-appearance: none;
}

::-webkit-scrollbar-track {
  border-radius: 10px;
  background-color: #ffffff;
}

::-webkit-scrollbar:horizontal {
  height: 12px;
  border-radius: 10px;
  border: 2px solid #ffffff;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, .5);
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

.control-panels {
  display: flex;
  gap: 20px;
  margin: 5x 0;
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

.color-button {
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }

  &.active {
    border-color: #2196F3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
  }
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
</style>
