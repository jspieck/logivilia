<template>
<div class="solvePage">
  <div class="puzzleContainer" draggable="false">
    <div id="puzzleHeader">
      <h1 class="puzzleTitle">{{nonogram.name}}</h1>
      <span class="difficulty">{{nonogram.difficulty}}/<strong>5</strong></span>
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
          <!-- <button id="loadNono" class="nonoButton"><ion-icon v-pre name="ios-folder-open"></ion-icon></button>
          <button id="saveNono" class="nonoButton"><ion-icon v-pre name="ios-save"></ion-icon></button> -->

          <svg id="colors" :height="cellWidthBase + 25" :width="colors.length * (cellWidthBase + 10) + 15">
            <g v-for="[i, color] in colors.entries()" v-bind:key="`color${i}`" :transform="`translate(${5 + i * (cellWidthBase + 10)}, 5)`">
              <rect :fill="color" stroke="black" :width="cellWidthBase" :height="cellWidthBase" @click="selectColor(i)"/>
              <circle v-if="i == colors.length - 1" class="circlePath" :cx="cellWidthBase / 2" :cy="cellWidthBase / 2" r="3"/>
              <rect v-if="selectedColor == i" fill="#f55656" :width="cellWidthBase" height="3" :y="cellWidthBase + 4"/> 
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
                      <path :d="`M ${cellWidth} 0 L 0 0 0 ${cellWidth}`" fill="none" stroke="#d7dadd" stroke-width="1"/>
                    </pattern>
                    <pattern id="grid" :width="cellWidth * 5" :height="cellWidth * 5" patternUnits="userSpaceOnUse">
                      <rect :width="cellWidth * 5" :height="cellWidth * 5" fill="url(#smallGrid)"/>
                      <path :d="`M ${cellWidth * 5} 0 L 0 0 0 ${cellWidth * 5}`" fill="none" stroke="black" stroke-width="2"/>
                    </pattern>
                  </defs>

                  <template v-for="[i, group] in verticalInfo.entries()">
                    <template v-for="[j, row] in group.entries()">
                      <g v-for="[k, cell] in row.entries()" v-bind:key="`cellCol${cell.id}`" :id="cell.id" :transform="`translate(${cellWidth * j + i * 5 * cellWidth}, ${cellWidth * k})`">
                        <rect :data-x="k" :data-y="j" :width="cellWidth" :height="cellWidth" :fill="cell.background"/>
                        <text :x="cellWidth / 2" :y="cellWidth / 2" :fill="cell.color" dominant-baseline="middle" text-anchor="middle" :style="`font-size: ${fontSize}px;`">{{cell.blockLength}}</text>
                      </g>
                      <rect v-bind:key="`correctCol${j + i * 5}}`" :y="verticalHeight * cellWidth" :x="cellWidth * (j + i * 5)" :width="cellWidth" height="7" :fill="indicatorColors[indicatorVertical[i * 5 + j]]"/>
                    </template>
                  </template>
                  <rect width="100%" height="100%" fill="url(#grid)" style="pointer-events: none" />
                </svg>
              </td>
            </tr>
            <tr>
              <td>
                <svg v-if="!solved" id="horizontalInformation" draggable="false" :width="horizontalWidth * cellWidth + 8" :height="height * cellWidth + 1">
                  <template v-for="[i, group] in horizontalInfo.entries()">
                    <template v-for="[j, row] in group.entries()" :id="`row${j}`">
                      <g v-for="[k, cell] in row.entries()" v-bind:key="`cell${cell.id}`" :id="cell.id" class="gridCell noSelect" @click="selectColor(cell.colorId)"
                        :transform="`translate(${cellWidth * k}, ${cellWidth * j + i * 5 * cellWidth})`">
                        <rect :width="cellWidth" :height="cellWidth" :fill="cell.background" stroke="transparent" :data-x="k" :data-y="j"/>
                        <text :x="cellWidth / 2" :y="cellWidth / 2" :fill="cell.color" dominant-baseline="middle" text-anchor="middle" :style="`font-size: ${fontSize}px;`">{{cell.blockLength}}</text>
                      </g>
                      <rect v-bind:key="`correctRow${j + i * 5}`" :x="horizontalWidth * cellWidth" :y="cellWidth * (j + i * 5)" width="7" :height="cellWidth" :fill="indicatorColors[indicatorHorizontal[i * 5 + j]]"/>
                    </template>
                  </template>
                  <rect width="100%" height="100%" fill="url(#grid)" style="pointer-events: none" />
                </svg>
              </td>
              <td>
                <svg id="mainArea" draggable="false" :class="solved ? 'solved' : 'mainArea'" :width="width * cellWidth + 1" :height="height * cellWidth + 1" oncontextmenu="return false;"       
                  @touchstart="e => {this.touchDownEvent(e);}" @touchmove="e => {this.touchMoveEvent(e);}" @touchend="e => {this.touchEndEvent(e);}">
                  <template v-for="[i, groupRow] in mainArea.entries()">
                    <template v-for="[j, group] in groupRow.entries()" class="gridGroup">
                      <template v-for="[k, row] in group.entries()" :id="`row${k}`" class="gridRow">
                        <g v-for="[l, cell] in row.entries()" v-bind:key="`cellMain${cell.id}`" :id="cell.id" class="gridCell noSelect"
                          :transform="`translate(${cellWidth * cell.x}, ${cellWidth * cell.y})`">
                          <rect :width="cellWidth" :height="cellWidth" :data-x="cell.x" :data-y="cell.y" :fill="`${colors[gridState[cell.y * width + cell.x]]}`" stroke="transparent"
                          :style="`line-height: ${cellWidth}px;`"
                          @mousedown="e => {cellMouseDown(e, cell.x, cell.y)}" @mouseenter="e => {cellMouseEnter(e, cell.x, cell.y)}"/>
                          <circle v-if="gridState[cell.y * width + cell.x] == colors.length - 1 && !solved" class="circlePath" :cx="cellWidth / 2" :cy="cellWidth / 2" r="3"/>  
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
        <!--<button id='checkButton' class='loes' @click="checkSolution">Überprüfen</button>-->
        <img v-if="solved" class="checking" src='@/assets/haken.png' width='40' height='40'/>
        <label v-if="solved" id="solved">Gratulation, dieses Rätsel ist gelöst!</label>
      </div>
      <div v-if="!solved && alreadySolved">
        Glückwunsch! Sie haben dieses Rätsel bereits gelöst.
      </div>
    </div>
  </div>
  <CommentSystem :riddleType="'nonogram'" :riddleId="computedId"/>
</div>
</template>

<script>
import UserService from '@/services/UserService';
import NonogramService from '@/services/NonogramService';
import NonogramRatingService from '@/services/NonogramRatingService';
import CommentSystem from '@/components/CommentSystem';

export default {
  name: 'NonogramSolve',
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
      startMouseDown: [0, 0],
      lastMouseOver: [0, 0],
      gridCells: [],
      isMouseDown: false,
      rightMouseButtonPressed: false,
      gridState: [],
      gridStateCopy: [],
      indicatorColors: ["#ff0000", "#00ff00"],
      indicatorHorizontal: [],
      indicatorVertical: [],
      darkColor: '#000000',
      lightColor: '#ffffff',
      fontSize: 18,
      nonogram: {
        width: 0,
        height: 0,
        colors: ['#FFFFFF', '#FFFFFF'],
        solution: []
      },
      rateMax: 5,
      rating: null,
      alreadySolved: false
      /* solution: [[1,1,1,1,1], [1,1,1,1,1], [1,1,1,1,1], [1,1,0,1,1], [1,1,1,1,1]] */
    };
  },
  async mounted() {
    const id = this.$store.state.route.params.id;
    this.nonogram = (await NonogramService.show(id)).data;
    this.setRating(id);
    if (this.loggedIn) {
      this.checkIfAlreadySolved();
    }

    this.gridState = new Array(this.width * this.height).fill(this.backgroundNumber);
    this.indicatorHorizontal = new Array(this.height).fill(0);
    this.indicatorVertical = new Array(this.width).fill(0);
    this.checkTotalNonogram();
    document.addEventListener("mouseup", () => {this.mainGridMouseUp()});
    window.ondragstart = function() { return false; }
    window.onbeforeunload = function() {
      return "Möchten Sie die Seite wirklich verlassen. Nicht gespeicherte Rätsel sind für immer verloren!";
    }
  },
  watch: {
    async id() {
      const id = this.$store.state.route.params.id;
      const nonogram = await NonogramService.show(id);
      this.nonogram = nonogram.data;
      this.setRating(id);
      if (this.loggedIn) {
        this.checkIfAlreadySolved();
      }

      this.gridState = new Array(this.width * this.height).fill(this.backgroundNumber);
      this.indicatorHorizontal = new Array(this.height).fill(0);
      this.indicatorVertical = new Array(this.width).fill(0);
      this.checkTotalNonogram();
    },
    loggedIn() {
      this.setRating(this.$store.state.route.params.id);
      this.checkIfAlreadySolved();
    },
    async rating() {
      try {
        if (this.rating != null) {
          await NonogramRatingService.post({
            NonogramId: parseInt(this.$store.state.route.params.id, 10),
            rating: this.rating
          });
        }
      } catch(err) {
        console.log(err);
      }
    }
  },
  computed: {
    computedId() {
      return this.$store.state.route.params.id;
    },
    loggedIn() {
      return this.$store.state.isUserLoggedIn;
    },
    height() {
      return this.nonogram.height;
    },
    width() {
      return this.nonogram.width;
    },
    colors() {
      const baseColors = [...this.nonogram.colors];
      baseColors.push('#FFFFFF');
      return baseColors;
    },
    backgroundNumber() {
      return this.colors.length - 2;
    },
    solution() {
      // turn 0 into the background color
      const solution = this.nonogram.solution;
      const adaptedSolution = [];
      for (const row of solution) {
        const adaptedRow = [];
        for (let i = 0; i < row.length; i++) {
          if (row[i] == 0) {
            adaptedRow.push(this.colors.length - 2);
          } else {
            adaptedRow.push(row[i] - 1);
          }
        }
        adaptedSolution.push(adaptedRow);
      }
      return adaptedSolution;
    },
    horizontalInfo() {
      const horizontalInfo = [];
      let cellId = 0;
      let longestRow = 0;
      for (let a = 0; a < this.height; a += 5) {
        const infoGroup = [];
        for (let b = 0; b < 5; b += 1) {
          const i = a + b;
          if (i >= this.height) {
            break;
          }
          const rowInfo = [];
          let currentNumber = this.solution[i][0];
          let currentNumberCounter = 1;
          for (let j = 1; j < this.width; j++) {
            if (this.solution[i][j] != currentNumber) {
              if (currentNumber != this.backgroundNumber && currentNumber != this.colors.length - 1) {
                rowInfo.push({
                  'colorId': currentNumber,
                  'id': cellId,
                  'color': this.fontColors[currentNumber],
                  'blockLength': currentNumberCounter,
                  background: this.colors[currentNumber]
                });
                cellId += 1;
              }
              currentNumber = this.solution[i][j];
              currentNumberCounter = 1;
            } else {
              currentNumberCounter += 1;
            }
          }
          if (currentNumber != this.backgroundNumber && currentNumber != this.colors.length - 1) {
            rowInfo.push({
              'colorId': currentNumber,
              'id': cellId,
              'color': this.fontColors[currentNumber],
              'blockLength': currentNumberCounter,
              background: this.colors[currentNumber]
            });
            cellId += 1;
          }
          infoGroup.push(rowInfo);
          longestRow = Math.max(longestRow, rowInfo.length);
        }
        horizontalInfo.push(infoGroup);
      }
      // fill row with empty cells
      for (const group of horizontalInfo) {
        for (const row of group) {
          for (let o = row.length; o < longestRow; o += 1) {
            row.unshift({
              'colorId': this.backgroundNumber,
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
    },
    horizontalWidth() {
      if (this.horizontalInfo[0] == null)
        return 0;
      return this.horizontalInfo[0][0].length;
    },
    horizontalClues() {
      const rowInfos = [];
      for (let b = 0; b < this.height; b++) {
        const rowInfo = [];
        let currentNumber = this.solution[b][0];
        let currentNumberCounter = 1;
        for (let a = 1; a < this.width; a++) {
          if (this.solution[b][a] != currentNumber) {
            if (currentNumber != this.backgroundNumber) {
              rowInfo.push({currentNumber, currentNumberCounter});
            }
            currentNumber = this.solution[b][a];
            currentNumberCounter = 1;
          } else {
            currentNumberCounter += 1;
          }
        }
        if (currentNumber != this.backgroundNumber) {
          rowInfo.push({currentNumber, currentNumberCounter});
        }
        rowInfos.push(rowInfo);
      }
      return rowInfos;
    },
    verticalClues() {
      const columnInfos = [];
      for (let b = 0; b < this.width; b++) {
        const columnInfo = [];
        let currentNumber = this.solution[0][b];
        let currentNumberCounter = 1;
        for (let a = 1; a < this.height; a++) {
          if (this.solution[a][b] != currentNumber) {
            if (currentNumber != this.backgroundNumber) {
              columnInfo.push({currentNumber, currentNumberCounter});
            }
            currentNumber = this.solution[a][b];
            currentNumberCounter = 1;
          } else {
            currentNumberCounter += 1;
          }
        }
        if (currentNumber != this.backgroundNumber) {
          columnInfo.push({currentNumber, currentNumberCounter});
        }
        columnInfos.push(columnInfo);
      }
      return columnInfos;
    },
    verticalInfo() {
      const verticalInfo = [];
      let cellId = 0;
      let longestColumn = 0;
      for (let a = 0; a < this.width; a += 5) {
        const infoGroup = [];
        for (let b = 0; b < 5; b += 1) {
          const i = a + b;
          if (i >= this.width) {
            break;
          }
          const columnInfo = [];
          let currentNumber = this.solution[0][i];
          let currentNumberCounter = 1;
          for (let j = 1; j < this.height; j += 1) {
            if (this.solution[j][i] != currentNumber) {
              if (currentNumber != this.backgroundNumber) {
                columnInfo.push({
                  'colorId': currentNumber,
                  'id': cellId,
                  'color': this.fontColors[currentNumber],
                  'blockLength': currentNumberCounter,
                  background: this.colors[currentNumber]
                });
                cellId += 1;
              }
              currentNumber = this.solution[j][i];
              currentNumberCounter = 1;
            } else {
              currentNumberCounter += 1;
            }
          }
          if (currentNumber != this.backgroundNumber) {
            columnInfo.push({
              'colorId': currentNumber,
              'id': cellId,
              'color': this.fontColors[currentNumber],
              'blockLength': currentNumberCounter,
              background: this.colors[currentNumber]
            });
            cellId += 1;
          }
          infoGroup.push(columnInfo);
          longestColumn = Math.max(longestColumn, columnInfo.length);
        }
        verticalInfo.push(infoGroup);
      }
      // fill row with empty cells
      for (const group of verticalInfo) {
        for (const row of group) {
          for (let o = row.length; o < longestColumn; o += 1) {
            row.unshift({
              'colorId': this.backgroundNumber,
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
    },
    verticalHeight() {
      if (this.verticalInfo[0] == null)
        return 0;
      return this.verticalInfo[0][0].length;
    },
    mainArea() {
      const mainArea = [];
      let cellId = 0;
      for(let i = 0; i < this.height; i += 5){
        const gridGroupRow = [];
        for(let j = 0; j < this.width; j += 5){
          const gridGroup = [];
          for(let k = i; k < Math.min(i + 5, this.height); k++){
            const gridRow = [];
            for(let l = j; l < Math.min(j + 5, this.width); l++){
              gridRow.push({
                'x': l, 'y': k, 'id': cellId
              })
              cellId += 1;
            }
            gridGroup.push(gridRow);
          }
          gridGroupRow.push(gridGroup);
        }
        mainArea.push(gridGroupRow);
      }
      return mainArea;
    },
    fontColors() {
      const fontColors = [];
      for (const color of this.colors) {
        fontColors.push(this.pickTextColorBasedOnBgColor(color));
      }
      return fontColors;
    }
  },
  methods: {
    scaleToScreenSize() {
      const MAX_WIDTH = 500;
      const PADDING = 50;
      const targetedWidth = Math.min(Math.max(PADDING, window.screen.width - PADDING), MAX_WIDTH);
      this.cellWidth = targetedWidth / this.nonogram.width;
    },
    async checkIfAlreadySolved() {
      // New request in case the user solved the puzzle since logging in
      const userData = (await UserService.show(this.$store.state.user.id)).data;
      const nonogramId = parseInt(this.$store.state.route.params.id, 10) - 1;
      this.alreadySolved = userData.solvedNonograms.includes(nonogramId);
    },
    async setRating(logicalId) {
      if (this.$store.state.user != null) {
        const res = await NonogramRatingService.show(logicalId);
        this.rating = res.data.rating;
      }
    },
    revertState() {
      if (this.revertIndex > 0) {
        const state = this.revertHistory[this.revertIndex - 1];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            this.$set(this.gridState, a * this.width + b, state['colorsBefore'][b - state['x0']][a - state['y0']]);
          }
        }
        this.revertIndex -= 1;
      }
    },
    restoreState() {
      if (this.revertIndex < this.revertHistory.length) {
        const state = this.revertHistory[this.revertIndex];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            this.$set(this.gridState, a * this.width + b, state['colorAfter']);
          }
        }
        this.revertIndex += 1;
      }
    },
    zoomIn() {
      this.cellWidth = (this.cellWidth + 5);
      this.fontSize += 3;
    },
    zoomOut() {
      this.cellWidth = Math.max((this.cellWidth - 5), 15);
      this.fontSize = Math.max((this.fontSize - 3), 12);
    },
    getLighting(color) {
      const colorInfo = color.substring(1);      // strip #
      const rgb = parseInt(colorInfo, 16);   // convert rrggbb to decimal
      const r = (rgb >> 16) & 0xff;  // extract red
      const g = (rgb >>  8) & 0xff;  // extract green
      const b = (rgb >>  0) & 0xff;  // extract blue
      return 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
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
    getSelectedColor() {
      if (this.rightMouseButtonPressed) {
        return this.backgroundNumber;
      } else {
        return this.selectedColor;
      }
    },
    getCellFromTouchPos(e) {
      const rect = document.getElementById("mainArea").getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      return [Math.floor(x / this.cellWidth), Math.floor(y / this.cellWidth)];
    },
    touchDownEvent(e) {
      const [horizontalCellIndex, verticalCellIndex] = this.getCellFromTouchPos(e);
      this.cellMouseDown(e, horizontalCellIndex, verticalCellIndex);
    },
    touchMoveEvent(e) {
      const [horizontalCellIndex, verticalCellIndex] = this.getCellFromTouchPos(e);
      this.cellMouseEnter(e, horizontalCellIndex, verticalCellIndex);
    },
    touchEndEvent() {
      this.mainGridMouseUp();
    },
    cellMouseDown(e, i, j) {
      if (!this.solved) {
        this.startMouseDown = [i, j];
        this.lastMouseOver = this.startMouseDown;
        this.isMouseDown = true;
        if (e.which == 3) {
          this.rightMouseButtonPressed = true;
        } else{
          this.rightMouseButtonPressed = false;
        }
        this.gridStateCopy = [...this.gridState];
        this.$set(this.gridState, j * this.width + i, this.getSelectedColor());
      }
    },
    cellMouseEnter(e, i1, j1) {
      if (this.isMouseDown) {
        const [i2, j2] = this.startMouseDown;
        const [i3, j3] = this.lastMouseOver;
        if (i1 !== i3) {
          for (let b = Math.min(i1, i3); b <= Math.max(i1, i3); b++) {
            for (let a = Math.min(j2, j3); a <= Math.max(j2, j3); a++) {
              const ind = a * this.width + b;
              // this.gridCells[ind].style.background = this.colors[this.gridState[ind]];
              this.$set(this.gridState, ind, this.gridStateCopy[ind]);
            }
          }
        }
        if (j1 !== j3) {
          for (let b = Math.min(j1, j3); b <= Math.max(j1, j3); b++) {
            for (let a = Math.min(i2, i3); a <= Math.max(i2, i3); a++) {
              const ind = b * this.width + a;
              // this.gridCells[ind].style.background = this.colors[this.gridState[ind]];
              this.$set(this.gridState, ind, this.gridStateCopy[ind]);
            }
          }
        }
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            // this.gridCells[b * this.width + a].style.background = this.colors[this.selectedColor];
            this.$set(this.gridState, b * this.width + a, this.getSelectedColor());
          }
        }
        this.lastMouseOver = [i1, j1];
      }
    },
    checkRow(b) {
      let rowInfo = this.horizontalClues[b];
      let checkIndex = 0;
      const startIndex = b * this.width;
      let currentNumber = this.gridState[startIndex];
      let currentNumberCounter = 1;
      for (let a = 1; a < this.width; a++) {
        if (this.gridState[startIndex + a] != currentNumber) {
          if (currentNumber != this.backgroundNumber && currentNumber != this.colors.length - 1) {
            if (checkIndex >= rowInfo.length || currentNumber != rowInfo[checkIndex].currentNumber || currentNumberCounter != rowInfo[checkIndex].currentNumberCounter) {
              return 0;
            }
            checkIndex += 1;
          }
          currentNumber = this.gridState[startIndex + a];
          currentNumberCounter = 1;
        } else {
          currentNumberCounter += 1;
        }
      }
      if (currentNumber != this.backgroundNumber && currentNumber != this.colors.length - 1) {
        if (checkIndex >= rowInfo.length || currentNumber != rowInfo[checkIndex].currentNumber || currentNumberCounter != rowInfo[checkIndex].currentNumberCounter) {
          return 0;
        }
        checkIndex += 1;
      }
      if (checkIndex != rowInfo.length) {
        return 0;
      }
      return 1;
    },
    checkColumn(b) {
      let columnInfo = this.verticalClues[b];
      let checkIndex = 0;
      let currentNumber = this.gridState[b];
      let currentNumberCounter = 1;
      for (let a = 1; a < this.height; a++) {
        if (this.gridState[this.width * a + b] != currentNumber) {
          if (currentNumber != this.backgroundNumber && currentNumber != this.colors.length - 1) {
            if (checkIndex >= columnInfo.length || currentNumber != columnInfo[checkIndex].currentNumber || currentNumberCounter != columnInfo[checkIndex].currentNumberCounter) {
              return 0;
            }
            checkIndex += 1;
          }
          currentNumber = this.gridState[this.width * a + b];
          currentNumberCounter = 1;
        } else {
          currentNumberCounter += 1;
        }
      }
      if (currentNumber != this.backgroundNumber && currentNumber != this.colors.length - 1) {
        if (checkIndex >= columnInfo.length || currentNumber != columnInfo[checkIndex].currentNumber || currentNumberCounter != columnInfo[checkIndex].currentNumberCounter) {
          return 0;
        }
        checkIndex += 1;
      }
      if (checkIndex != columnInfo.length) {
        return 0;
      }
      return 1;
    },
    mainGridMouseUp() {
      // TODO handle mouse leave
      if (this.isMouseDown) {
        const [i1, j1] = this.startMouseDown;
        const [i2, j2] = this.lastMouseOver;
        const stateBefore = [];
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          const stateBeforeRow = [];
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            const ind = b * this.width + a;
            stateBeforeRow.push(this.gridStateCopy[ind]);
            this.gridState[ind] = this.getSelectedColor();
          }
          stateBefore.push(stateBeforeRow);
        }
        const revertObj = {
          'x0': Math.min(i1, i2),
          'x1': Math.max(i1, i2),
          'y0': Math.min(j1, j2),
          'y1': Math.max(j1, j2),
          'colorAfter': this.getSelectedColor(),
          'colorsBefore': stateBefore
        }
        
        if (this.revertIndex < this.revertHistory.length) {
          this.revertHistory[this.revertIndex] = revertObj;
          this.revertHistory.length = this.revertIndex + 1;
        } else {
          this.revertHistory.push(revertObj);
        }
        this.revertIndex += 1;
        
        for (let b = Math.min(i1, i2); b <= Math.max(i1, i2); b++) {
          this.$set(this.indicatorVertical, b, this.checkColumn(b));
        }
        for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
          this.$set(this.indicatorHorizontal, b, this.checkRow(b));
        }
        // check if finished
        if (this.indicatorHorizontal.every( v => v === 1 ) &&
          this.indicatorVertical.every( v => v === 1 ) ) {
          this.solved = true;
          this.scaleToScreenSize();
          if (!this.alreadySolved) {
            this.saveSolvedNono();
          }
        }
        this.isMouseDown = false;
      }
    },
    checkTotalNonogram() {
      for (let i = 0; i < this.width; i++) {
        this.$set(this.indicatorVertical, i, this.checkColumn(i));
      }
       for (let i = 0; i < this.height; i++) {
        this.$set(this.indicatorHorizontal, i, this.checkRow(i));
      }
    },
    /* createMainArea() {
      const mainArea = this.$refs.mainArea;
      mainArea.innerHTML = "";
      for(let i = 0; i < this.height; i += 5){
        const gridGroupRow = document.createElement("div");
        gridGroupRow.setAttribute("class", "gridRow");
        for(let j = 0; j < this.width; j += 5){
          const gridGroup = document.createElement("div");
          gridGroup.setAttribute("class", "gridGroup");
          for(let k = i; k < Math.min(i + 5, this.height); k++){
            const gridRow = document.createElement("div");
            gridRow.setAttribute("class", "gridRow");
            for(let l = j; l < Math.min(j + 5, this.width); l++){
              const gridCell = document.createElement("div");
              gridCell.setAttribute("id", "cell" + k + "_" + l);
              gridCell.setAttribute("data-x", l);
              gridCell.setAttribute("data-y", k);
              gridCell.setAttribute("class", "gridCell noselect");
              gridRow.appendChild(gridCell);
              this.gridCells.push(gridCell);
              gridCell.addEventListener("mousedown", e => {this.cellMouseDown(e, l, k)}, false);
              gridCell.addEventListener("mouseenter", e => {this.cellMouseEnter(e, l, k)}, false);
            }
            gridGroup.appendChild(gridRow);
          }
          gridGroupRow.appendChild(gridGroup);
        }
        mainArea.appendChild(gridGroupRow);
      }
      document.addEventListener("mouseup", this.mainGridMouseUp, false);
      // Touch events on canvas
      // canvasGrid.addEventListener("touchleave", doTouchOutEvent, false);

      // Problem if not outside but not over cell
      // if(typ == "none" || typ == "create"){
      //     document.getElementById("alignKapsel").addEventListener("mouseleave", doMouseOutEvent, false);
      // }else
      //     canvasGrid.addEventListener("mouseleave", doMouseOutEvent, false);
      // 
      // jQuery('body').on('contextmenu', '#gridRid', function(e){ return false; });
      // zoom();
    }, */
    async saveSolvedNono() {
      if (this.loggedIn) {
        const userId = this.$store.state.user.id;
        const nonogramd = parseInt(this.$store.state.route.params.id, 10) - 1;
        const isSuccess = await UserService.nonogramSolved(userId, nonogramd);
        // TODO do something if riddle couldn't be saved
        console.log("Suc", isSuccess);
      }
    },
    setCell(i, j, k) {
      const index = this.cellIndex(i, j, k);
      this.$set(this.gridState, index, this.selectedColor);
      // if a cross is set, consider it for the solution
      const row = (k - 1) % this.numCells;
      if (this.selectedColor == 0) {
        if (i == 1) {
          this.attrInputs[`${row}_${j - 1}`] = this.attributes[j].values[Math.floor((k - 1) / this.numCells)];
        }
      }
    },
    cellIndex(i, j, k) {
      let index = 0;
      for(let c = 0; c < i - 1; c++) {
        index += this.numBlocks - 1 - c;
      }
      return (index + j - 1) * this.numCells * this.numCells + (k - 1);
    },
    selectColor(colorId) {
      this.selectedColor = colorId;
    }
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
