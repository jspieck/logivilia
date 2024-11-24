<template>
<div class="solvePage">
  <div class="puzzleContainer" draggable="false">
    <div id="puzzleHeader">
      <h1 class="puzzleTitle">{{linelog.name}}</h1>
      <span class="difficulty">{{linelog.difficulty}}/<strong>5</strong></span>
    </div>
    <div id="puzzle" class="puzzleBody">
      <div id="nonoArea">
        <b-notification
          type="is-warning"
          role="alert">
          Dieser Rätseltyp befindet sich noch in der Testphase. Es kann zu Fehlern kommen.
        </b-notification>
        <button id="zoomIn" @click="zoomIn" class="nonoButton largerIcon">
          <ion-icon v-pre name="add"></ion-icon>
        </button>
        <button id="zoomOut" @click="zoomOut" class="nonoButton largerIcon">
          <ion-icon v-pre name="remove"></ion-icon>
        </button>
        <!-- <button id="revert" @click="revertState" class="nonoButton"><ion-icon class="rotate" v-pre name="ios-refresh"></ion-icon></button>
        <button id="restore" @click="restoreState" class="nonoButton"><ion-icon v-pre name="ios-refresh"></ion-icon></button> -->
        <svg id="colors" :height="cellWidthBase + 25" :width="colors.length * (cellWidthBase + 10) + 15">
          <g v-for="[i, color] in colors.entries()" v-bind:key="`color${i}`" :transform="`translate(${5 + i * (cellWidthBase + 10)}, 5)`">
            <rect :fill="color" stroke="black" :width="cellWidthBase" :height="cellWidthBase" @click="selectColor(i)"/>
            <rect v-if="selectedColor == i" fill="#f55656" :width="cellWidthBase" height="3" :y="cellWidthBase + 4"/> 
          </g>
        </svg>
        <!-- <button id="loadNono" class="nonoButton"><ion-icon v-pre name="ios-folder-open"></ion-icon></button>
        <button id="saveNono" class="nonoButton"><ion-icon v-pre name="ios-save"></ion-icon></button> -->
        <div id="linelogGridContainer">
          <svg id="mainArea" draggable="false" :class="solved ? 'solved' : 'mainArea'" :width="width * cellWidth + 1" :height="height * cellWidth + 1"
            @mousedown="e => {mouseDown(e)}" @mousemove="e => {mouseMove(e)}" @touchstart="e => {touchDown(e)}" @touchmove="e => {touchMove(e)}">
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
      <p v-if="!loggedIn">Um das Rätsel zu bewerten, müssen Sie sich einloggen.</p>
      <div id='checkSolutionBox'>
        <img v-if="solved" class="checking" src='@/assets/haken.png' width='40' height='40'/>
        <label v-if="solved" id="solved">Gratulation! Sie haben dieses Rätsel gelöst!</label>
      </div>
      <div v-if="!solved && alreadySolved">
        Glückwunsch! Sie haben dieses Rätsel bereits gelöst.
      </div>
    </div>
  </div>
  <CommentSystem :riddleType="'linelog'" :riddleId="computedId"/>
</div>
</template>

<script>
import LinelogService from '@/services/LinelogService';
import LinelogRatingService from '@/services/LinelogRatingService';
import UserService from '@/services/UserService';
import CommentSystem from '@/components/CommentSystem'

export default {
  name: 'LinelogSolve',
  props: ['id'],
  components: {
    CommentSystem: CommentSystem
  },
  data() {
    return {
      revertHistory: [],
      revertIndex: 0,
      cellWidth: 25,
      cellWidthBase: 25,
      selectedColor: 0,
      solved: false,
      gridCells: [],
      isMouseDown: false,
      gridState: [],
      gridStateCopy: [],
      lastMousePos: [],
      lastSetCell: [],
      paths: {},
      pathIndex: 0,
      currentPath: null,
      darkColor: '#000000',
      lightColor: '#ffffff',
      strokeWidth: 11,
      notificationActive: false,
      fontSize: 16,
      pathIndices: [],
      mouseMoveReachedEnd: false,
      cellMarkDisabled: false,
      originalCells: [],
      linelog: {
        name: "",
        difficulty: 0,
        width: 0,
        height: 0,
        information: [],
        solution: [],
        colors: ["#FFFFFF"]
      },
      rateMax: 5,
      rating: null,
      alreadySolved: false
    };
  },
  async mounted() {
    const id = this.$store.state.route.params.id;
    this.linelog = (await LinelogService.show(id)).data;
    this.setRating(id);

    this.gridState = new Array(this.width * this.height).fill(this.backgroundNumber);
    this.pathIndices = new Array(this.width * this.height).fill(-1);
    for (let y = 0; y < this.information.length; y++) {
      for (let x = 0; x < this.information[y].length; x++) {
        if (this.information[y][x] != 0 ) {
          this.gridState[x + y * this.width] = this.solution[y][x];
        }
      }
    }
    if (this.loggedIn) {
      this.checkIfAlreadySolved();
    }
    // this.checkTotalNonogram();
    document.addEventListener("mouseup", () => {this.mainGridMouseUp()});
    document.addEventListener("touchend", () => {this.mainGridMouseUp()});
    window.ondragstart = function() { return false; }
    window.onbeforeunload = function() {
      return "Möchten Sie die Seite wirklich verlassen. Nicht gespeicherte Rätsel sind für immer verloren!";
    }
  },
  watch: {
    async id() {
      const id = this.$store.state.route.params.id;
      this.nonogram  = (await LinelogService.show(id)).data;
      this.setRating(id);
      if (this.loggedIn) {
        this.checkIfAlreadySolved();
      }
      this.gridState = new Array(this.width * this.height).fill(this.backgroundNumber);
      // this.checkTotalNonogram();
    },
    loggedIn() {
      this.checkIfAlreadySolved();
      this.setRating(this.$store.state.route.params.id);
    },
    async rating() {
      try {
        if (this.rating != null) {
          await LinelogRatingService.post({
            LinelogId: parseInt(this.$store.state.route.params.id, 10),
            rating: this.rating
          });
        }
      } catch(err) {
        console.log(err);
      }
    }
  },
  computed: {
    height() {
      return this.linelog.height;
    },
    width() {
      return this.linelog.width;
    },
    colors() {
      return this.linelog.colors;
    },
    backgroundNumber() {
      return this.colors.length - 1;
    },
    information() {
      const information = [];
      // create a copy
      for (const row of this.linelog.information) {
        const infoRow = [];
        for (const cell of row) {
          infoRow.push(cell);
        } 
        information.push(infoRow);
      }
      return information;
    },
    solution() {
      const solution = [];
      // create a copy
      for (const row of this.linelog.solution) {
        const solutionRow = [];
        for (const cell of row) {
          if (cell == 0) {
             solutionRow.push(this.backgroundNumber);
          } else {
            solutionRow.push(cell - 1);
          }
        } 
        solution.push(solutionRow);
      }
      return solution;
    },
    fontColors() {
      const fontColors = [];
      for (const color of this.colors) {
        fontColors.push(this.pickTextColorBasedOnBgColor(color));
      }
      return fontColors;
    },
    loggedIn() {
      return this.$store.state.isUserLoggedIn;
    },
    computedId() {
      return this.$store.state.route.params.id;
    }
  },
  methods: {
    scaleToScreenSize() {
      const MAX_WIDTH = 500;
      const PADDING = 50;
      const targetedWidth = Math.min(Math.max(PADDING, window.screen.width - PADDING), MAX_WIDTH);
      this.cellWidth = targetedWidth / this.linelog.width;
    },
    async checkIfAlreadySolved() {
      // New request in case the user solved the puzzle since logging in
      const userData = (await UserService.show(this.$store.state.user.id)).data;
      const linelogId = parseInt(this.$store.state.route.params.id, 10) - 1;
      this.alreadySolved = userData.solvedLinelogs.includes(linelogId);
    },
    async setRating(logicalId) {
      if (this.$store.state.user != null) {
        const res = await LinelogRatingService.show(logicalId);
        this.rating = res.data.rating;
      }
    },
    showZoomLevel() {
      this.$buefy.toast.open({
        duration: 500,
        message: `Zoom: ${Math.round(this.cellWidth / this.cellWidthBase * 100)} %`,
        position: 'is-top-right',
        queue: false,
        closable: false,
        type: 'is-info'
      });
    },
    errorMessage(text) {
      if (!this.solved) {
        this.$buefy.toast.open({
          duration: 500,
          message: text,
          position: 'is-top-right',
          queue: false,
          closable: false,
          type: 'is-danger'
        });
      }
    },
    zoomIn() {
      this.cellWidth = (this.cellWidth + 5);
      this.fontSize += 3;
      this.strokeWidth += 2;
      this.notificationActive = true;
      this.showZoomLevel();
    },
    zoomOut() {
      this.cellWidth = Math.max((this.cellWidth - 5), 15);
      this.fontSize = Math.max((this.fontSize - 3), 12);
      this.strokeWidth = Math.max((this.strokeWidth - 2), 7);
      this.notificationActive = true;
      this.showZoomLevel();
    },
    revertState() {
      /* if (this.revertIndex > 0) {
        const state = this.revertHistory[this.revertIndex - 1];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            this.$set(this.gridState, a * this.width + b, state['colorsBefore'][b - state['x0']][a - state['y0']]);
          }
        }
        this.revertIndex -= 1;
      } */
    },
    restoreState() {
      /* if (this.revertIndex < this.revertHistory.length) {
        const state = this.revertHistory[this.revertIndex];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            this.$set(this.gridState, a * this.width + b, state['colorAfter']);
          }
        }
        this.revertIndex += 1;
      } */
    },
    selectColor(colorId) {
      this.selectedColor = colorId;
    },
    pickTextColorBasedOnBgColor(bgColor) {
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
      return (L > 0.179) ? this.darkColor : this.lightColor;
    },
    createPath(cells) {
      // can be made faster by array join :)
      let path = `M${(cells[0][0] + 0.5) * this.cellWidth} ${(cells[0][1] + 0.5) * this.cellWidth}`;
      for (let i = 1; i < cells.length; i++) {
        path += `L${(cells[i][0] + 0.5) * this.cellWidth} ${(cells[i][1] + 0.5) * this.cellWidth}`;
      }
      return path;
    },
    getCellFromTouchPos(e) {
      const rect = e.target.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      // console.log(x, y);
      return [Math.floor(x / this.cellWidth), Math.floor(y / this.cellWidth)];
    },
    getCellFromMousePos(e) {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // console.log(x, y);
      return [Math.floor(x / this.cellWidth), Math.floor(y / this.cellWidth)];
    },
    touchDown(e) {
      const [x, y] = this.getCellFromTouchPos(e);
      this.downEvent(x, y);
    },
    mouseDown(e) {
      const [x, y] = this.getCellFromMousePos(e);
      this.downEvent(x, y);
    },
    downEvent(x, y) {
      const pathIndex = this.pathIndices[y * this.width + x];
      const [x0, y0] = pathIndex == -1 ? [0, 0] : this.paths[pathIndex].cells[0];
      const [x1, y1] = pathIndex == -1 ? [0, 0] : this.paths[pathIndex].cells[this.paths[pathIndex].cells.length - 1];
      const correctLength = pathIndex == -1 ? this.information[y][x] : this.paths[pathIndex].correctLength;

      // allow only the information cell if path already completed
      if (pathIndex != -1 && this.information[y][x] != 0 && (this.information[y0][x0] == 0 || this.information[y1][x1] == 0)) {
        return;
      }
      // we cannot start on a path in the middle of a path
      if (pathIndex == -1 || ((x0 == x && y0 == y) || (x1 == x && y1 == y))) { // && this.information[y][x] == 0
        this.isMouseDown = true;
        this.lastMousePos = [x, y];
        this.lastSetCell = [x, y];
        const color = this.gridState[x + this.width * y];
        this.currentPath = {
          "id": this.pathIndex,
          "color": color,
          "correctLength": correctLength,
          "cells": [[x, y]]
        };
        this.selectedColor = color;
        // if our starting cell belongs to another path, add this path to the beginning of the new path
        this.originalCells = [];
        if (pathIndex != -1 && ((x0 == x && y0 == y) || (x1 == x && y1 == y))) {
          // console.log(x0, y0, x1, y1, x, y);
          // reverse path if we start on an information cell from the wrong direction
          if (this.information[y][x] != 0) {
            if (x0 == x && y0 == y) {
              this.paths[pathIndex].cells = this.paths[pathIndex].cells.reverse();
              // console.log("Cells reversed");
            }
            // unmark path indices at the middle of the path
            for (const [x, y] of this.paths[pathIndex].cells) {
              this.pathIndices[y * this.width + x] = -1;
            }
            
          }
          const cells = [];
          for (const cell of this.paths[pathIndex].cells) {
            cells.push(cell);
          }
          this.originalCells = cells;
          this.currentPath.cells = this.paths[pathIndex].cells;
          // delete old path if it is replaced
          if (this.information[y][x] != 0) {
            delete this.paths[pathIndex];
          }
          // console.log(this.currentPath.cells);
        }
      }
    },
    touchMove(e) {
      if (this.isMouseDown) {
        const [x, y] = this.getCellFromTouchPos(e);
        this.moveEvent(x, y);
      }
    },
    mouseMove(e) {
      if (this.isMouseDown) {
        const [x, y] = this.getCellFromMousePos(e);
        this.moveEvent(x, y);
      }
    },
    moveEvent(x, y) {
      if (this.solved)
        return;
      if (x < 0 || y < 0 || x >= this.width || y >= this.height)
        return;
      if (x != this.lastMousePos[0] || y != this.lastMousePos[1]) {
        // do nothing if already on path; except if second last, delete last cell
        let count = 0;
        for (const [xa, ya] of this.currentPath.cells) {
          if (x == xa && y == ya) {
            if (count == this.currentPath.cells.length - 2) {
              this.currentPath.cells.pop();
              this.lastSetCell = [x, y];
              this.lastMousePos = [x, y];
              this.cellMarkDisabled = false;
            }
            return;
          }
          count += 1;
        }
        const cellColor = this.gridState[y * this.width + x];
        const pathIndex = this.pathIndices[y * this.width + x];
        // empty field or start/ end of another path
        const [x0, y0] = pathIndex == -1 ? [0, 0] : this.paths[pathIndex].cells[0];
        const [x1, y1] = pathIndex == -1 ? [0, 0] : this.paths[pathIndex].cells[this.paths[pathIndex].cells.length - 1];
        const correctLength = pathIndex == -1 ? this.information[y][x] : this.paths[pathIndex].correctLength;
        let cellReachable = true;
        if (this.cellMarkDisabled) {
          this.errorMessage("Pfad schon komplett");
          cellReachable = false;
        }
        // if end box, only if same color and same number (TODO) and unused
        if (cellReachable && this.information[y][x] != 0 && this.selectedColor != this.solution[y][x]) {
          this.errorMessage("Falsche Farbe");
          cellReachable = false;
        }
        // TODO also do for paths that are connecting
        if (cellReachable && this.currentPath.cells.length + 1 > this.currentPath.correctLength) {
          this.errorMessage("Zu langer Pfad");
          cellReachable = false;
        }
        if (cellReachable && this.information[y][x] != 0 && (correctLength != this.currentPath.correctLength || correctLength  - 1 != this.currentPath.cells.length)) {
          this.errorMessage("Unterschiedliche Pfadlänge");
          cellReachable = false;
        }
        // cell mustn't be of another color and if has to be the end or start of another path
        if (cellReachable && cellColor != this.backgroundNumber && cellColor != this.selectedColor) {
          this.errorMessage("Feld anders gefärbt");
          cellReachable = false;
        }
        if (cellReachable && cellColor != this.backgroundNumber && pathIndex != -1 && !(x == x0 && y == y0) && !(x == x1 && y == y1)) {
          this.errorMessage("Feld in der Mitte eines anderen Pfades");
          cellReachable = false;
        }
        if (cellReachable && cellColor != this.backgroundNumber && pathIndex != -1 && ((x == x0 && y == y0) || (x == x1 && y == y1))) {
          // check if paths can be merged
          const mergeLength = this.currentPath.cells.length + this.paths[pathIndex].cells.length;
          if (mergeLength != this.currentPath.correctLength) {
            this.errorMessage("Falsche Länge des kombinierten Pfads");
            cellReachable = false;
          } else {
            this.cellMarkDisabled = true;
          }
        }
        if (cellReachable) {
          // console.log([x, y], this.currentPath.cells);
          // if not one position horizontal/vertical do nothing
          if (Math.abs(x - this.lastSetCell[0]) + Math.abs(y - this.lastSetCell[1]) == 1) {
            // add current field to path
            this.currentPath.cells.push([x, y]);
            this.lastSetCell = [x, y];
          }
        }
      }
      this.lastMousePos = [x, y];
    },
    checkIfSolved() {
      let solved = true;
      for (let y = 0; y < this.solution.length; y++) {
        for (let x = 0; x < this.solution[y].length; x++) {
          // check that twos are connected
          if ((this.information[y][x] > 1 && this.pathIndices[y * this.width + x] == -1) ||
            this.solution[y][x] != this.gridState[y * this.width + x]) {
            solved = false;
            break;
          }
        }
      }
      this.solved = solved;
      if (this.solved) {
        this.scaleToScreenSize();
      }
      if (!this.alreadySolved && this.solved) {
        this.saveSolvedLinelog();
      }
    },
    async saveSolvedLinelog() {
      if (this.$store.state.isUserLoggedIn) {
        const userId = this.$store.state.user.id;
        const linelogId = parseInt(this.$store.state.route.params.id, 10) - 1;
        const isSuccess = await UserService.linelogSolved(userId, linelogId);
        // TODO do something if riddle couldn't be saved
        console.log("Suc", isSuccess);
      }
    },
    setPathIndices(cells, pathIndex) {
      for (const [x, y] of cells) {
        this.pathIndices[y * this.width + x] = pathIndex;
      }
    },
    mainGridMouseUp() {
      this.cellMarkDisabled = false;
      if (this.isMouseDown) {
        if (this.currentPath != null) {
          // check if overlap with other paths exists
          const [x0, y0] = this.currentPath.cells[0];
          const pathIndex0 = this.pathIndices[y0 * this.width + x0];
          const [x1, y1] = this.currentPath.cells[this.currentPath.cells.length - 1];
          const pathIndex1 = this.pathIndices[y1 * this.width + x1];
          /* if (pathIndex0 != -1) {
            
            // append to old path (minus overlapping cell)
            for (let i = 1; i < this.currentPath.cells.length; i++) {
              this.paths[pathIndex0].cells.push(this.currentPath.cells[i]);
            }
            this.setPathIndices(this.paths[pathIndex0].cells, pathIndex0); 
          } */
          // clear cells of old path
          for (const [x, y] of this.originalCells) {
            if (this.information[y][x] == 0) {
              this.gridState[y * this.width + x] = this.backgroundNumber;
            }
            this.pathIndices[y * this.width + x] = -1;
          }
          this.originalCells = [];
          if (this.currentPath.cells.length > 1) {
            if (pathIndex1 != -1 && pathIndex0 != pathIndex1) {
              // append to old path (minus overlapping cell)
              for (let i = this.currentPath.cells.length - 2; i >= 0; i--) {
                this.paths[pathIndex1].cells.push(this.currentPath.cells[i]);
              }
              this.setPathIndices(this.paths[pathIndex1].cells, pathIndex1);
            } else {
              // add new path to paths
              this.setPathIndices(this.currentPath.cells, this.pathIndex);
              this.paths[this.pathIndex] = this.currentPath;
              this.pathIndex += 1;
            }
            // console.log(pathIndex1, pathIndex0, this.currentPath.cells);
            for (const [x, y] of this.currentPath.cells) {
              this.gridState[y * this.width + x] = this.currentPath.color;
            }
          }
          if (pathIndex0 != -1) {
            delete this.paths[pathIndex0];
          }
        }
        this.currentPath = null;
        this.isMouseDown = false;
        // check if solved
        this.checkIfSolved();
      }
    }
  },
};
</script>

<style lang="scss">
  .solvePage {
    width: 100%;  
  }
  #mainArea {
    display: block;
    touch-action: none;
    overflow-x: scroll;
  }
  #colors {
    display: block;
    margin-top: 15px;
  }
  .linelogNoSelect {
    user-select: none;
    pointer-events: none;
  }
  .notification {
    padding: 0px 12px !important;
  }
  .notification > .delete {
    position: absolute;
    right: 2px !important;
    top: 1px !important;
  }
  #linelogGridContainer {
    overflow-x: scroll;
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
</style>
