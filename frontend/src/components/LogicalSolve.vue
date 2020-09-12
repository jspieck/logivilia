<template>
<div class="solvePage">
  <div class="puzzleContainer" v-if="logical != null">
    <div id="puzzleHeader">
      <h1 class="puzzleTitle">{{logical.name}}</h1>
      <span class="difficulty">{{logical.difficulty}}/<strong>5</strong></span>
    </div>
    <img id='headerImage' :src="logical.image" alt='header image' width='320'/>
    <div id="puzzle" class="puzzleBody">
      <h3 id="descrHeader">Beschreibung</h3>
      <p id="description">{{logical.description}}</p>
      <label class="logicalQuestion"><strong>{{logical.question}}</strong></label>
      <h3>Hinweise</h3>
      <ol id="clues">
        <li v-for="[i, clue] in logical.clues.entries()" v-bind:key='`clueActual${i}`' class="clue">{{clue}}</li>
      </ol>
      <label class="bold">Attribute</label>
      <ul id="attrList">
        <li v-for="[i, attr] in logical.attributes.entries()" v-bind:key='`realAtr${i}`'>
          <div class="attrRow">
            <strong>{{attr.name}}: </strong>
            <span v-for="[j, v] in attr.values.entries()" v-bind:key='`realAt${j}`'>
              {{v}}<span v-if="j != attr.values.length - 1">, </span>
            </span>
          </div>
        </li>
      </ul>
      <h3>Lösung</h3>
      <div class="eitherOr">
        <div id="wrapMe" class="wrapMe">
          <label id="nummerierung">Zeige die erweiterte Tabelle:</label>
          <MToggle class="solutionToggle" v-model="tableVisible"/>
        </div>
        <div v-if="tableVisible" id="solutionGrid">
          <div id="cDiv">
            <svg id="colors" height="50" width="150">
              <g v-for="[i, color] in colors.entries()" v-bind:key="`color${i}`" :transform="`translate(${5 + i * (cellWidth + 10)}, 5)`">
                <rect :fill="color" stroke="black" :width="cellWidth" :height="cellWidth" @click="selectColor(i)"/>
                <path v-if="i == 0" class="crossPath" :d="`M5 5L${cellWidth - 5} ${cellWidth - 5}M5 ${cellWidth - 5}L${cellWidth - 5} 5`" stroke="#565656"/>
                <rect v-if="selectedColor == i" fill="#f55656" :width="cellWidth" height="3" :y="cellWidth + 4"/> 
              </g>
            </svg>
            <button id="revert" @click="revertState" class="nonoButton">
              <ion-icon class="rotate" v-pre name="refresh"></ion-icon>
            </button>
            <button id="restore" @click="restoreState" class="nonoButton">
              <ion-icon v-pre name="refresh"></ion-icon>
            </button>
          </div>
          <div id="classicGrid" class="gridContainer">
            <div id="solutionGridNonCanvas">
              <svg :width="svgWidth" :height="svgHeight">
                <g v-for="[i, attr] in (logical.attributes.slice(0, 1).concat(logical.attributes.slice(2, logical.attributes.length))).entries()"
                :transform="`translate(0, ${paddingTop + i * numAttrValues * cellWidth})`"
                v-bind:key='`hgroup${i}`' class="horizontalTextGroup">
                  <text v-for="[j, val] in attr.values.entries()" ref="horizontalLabels" v-bind:key='`htext${val}`' x="0"
                  :y="j * cellWidth + cellWidth / 2 + 2">{{val}}</text>
                </g>
                <g v-for="[i, attr] in logical.attributes.slice(1, logical.attributes.length).entries()"
                :transform="`translate(${paddingLeft + i * numAttrValues * cellWidth}, 0)`"
                v-bind:key='`vgroup${i}`' class="verticalTextGroup">
                  <text v-for="[j, val] in attr.values.entries()" ref="verticalLabels" v-bind:key='`vtext${val}`' y="0"
                  :x="j * cellWidth + cellWidth / 2 + 2">{{val}}</text>
                </g>
                <g id="blockArea" :transform="`translate(${paddingLeft}, ${paddingTop})`">
                  <template v-for="i in numAttributes">
                    <g v-for="j in numAttributes - i" v-bind:key="`cblock${i}_${j}`"
                    :transform="`translate(${(j - 1) * blockWidth}, ${(i - 1) * blockWidth})`">
                      <g v-for="k in numAttrValues * numAttrValues" v-bind:key="`cell${k}`"
                      :transform="`translate(${Math.floor((k - 1) / numAttrValues) * cellWidth}, ${((k - 1) % numAttrValues) * cellWidth})`">
                        <rect :width="cellWidth" :height="cellWidth" class="blockGroups" :fill="colors[gridState[cellIndex(i, j, k)]]"
                        stroke="#c5c5c5" @mousedown="mouseDown(i, j, k)" @mouseenter="mouseEnter(i, j, k)"/>
                        <path v-if="gridState[cellIndex(i, j, k)] == 0" class="crossPath"
                        :d="`M5 5L${cellWidth - 5} ${cellWidth - 5}M5 ${cellWidth - 5}L${cellWidth - 5} 5`" stroke="#565656"/>
                      </g>
                    </g>
                  </template>
                  <path stroke="black" stroke-width="1" :d="drawOutline()"/>
                </g>
              </svg>
            </div>
          </div>
        </div>
        <div class="responsive-table">
          <table id="solTable" class="dataTable sortable">
            <thead>
              <tr>
                <th v-for="attr in logical.attributes" v-bind:key='attr.name' scope='col' class='tableH'>
                  {{attr.name}}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="[i, v] in logical.attributes[0].values.entries()" v-bind:key='i'>
                <td scope='row'>{{v}}</td>
                <td v-for="[j, attr] in logical.attributes.slice(1).entries()"
                  v-bind:key='j' :data-title='attr.name'>
                  <MSelect :options='logical.attributes[j + 1].values' v-model='attrInputs[i + "_" + j]'/>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div id='checkSolutionBox'>
        <button id='checkButton' class='loes' @click="checkSolution">Überprüfen</button>
        <img v-if="solved" class="checking" src='@/assets/haken.png' width='40' height='40'/>
      </div>
      <h4 id="solved">{{solveLabel}}</h4>

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
      <div v-if="!solved && alreadySolved">
        Glückwunsch! Sie haben dieses Rätsel bereits gelöst.
      </div>
    </div>
  </div>
  <CommentSystem :riddleType="'logical'" :riddleId="computedId"/>
</div>
</template>

<script>
import Toggle from './Toggle';
import Select from './Select';
import UserService from '@/services/UserService';
import LogicalService from '@/services/LogicalService';
import LogicalRatingService from '@/services/LogicalRatingService';
import CommentSystem from '@/components/CommentSystem';

export default {
  name: 'LogicalSolve',
  props: ['id'],
  components: {
    MToggle: Toggle,
    MSelect: Select,
    CommentSystem: CommentSystem
  },
  data() {
    return {
      revertHistory: [],
      revertIndex: 0,
      attrInputs: {},
      solved: false,
      gridState: [],
      gridStateCopy: [],
      cellWidth: 25,
      paddingLeft: 50,
      paddingTop: 50,
      tableVisible: true,
      selectedColor: 0,
      colors: ["#fff", "#333", "#fff"],
      solveLabel: "",
      logical: {
        name: "",
        difficulty: 0,
        description: "",
        question: "",
        clues: [],
        attributes: [{"name": "", "values": []}],
        image: "",
        date: "",
        author: "",
        solution: []
      },
      rating: null,
      rateMax: 5,
      alreadySolved: false
    };
  },
  watch: {
    async id() {
      const id = this.$store.state.route.params.id;
      const logical = await LogicalService.show(id);
      this.setRating(id);
      this.logical = logical.data;
      if (this.loggedIn) {
        this.checkIfAlreadySolved();
      }
  
      this.$nextTick(() => {
        this.setPadding();
      });
    },
    loggedIn() {
      this.setRating(this.$store.state.route.params.id);
      this.checkIfAlreadySolved();
    },
    async rating() {
      try {
        if (this.rating != null) {
          await LogicalRatingService.post({
            LogicalId: parseInt(this.$store.state.route.params.id, 10),
            rating: this.rating
          });
        }
      } catch(err) {
        console.log(err);
      }
    }
  },
  async mounted() {
    const id = this.$store.state.route.params.id;
    const logical = await LogicalService.show(id);
    this.logical = logical.data;
    console.log(this.logical);
    this.setRating(id);
    if (this.loggedIn) {
      this.checkIfAlreadySolved();
    }

    this.tableVisible = true;
    document.addEventListener("mouseup", this.mainGridMouseUp, false);
    window.ondragstart = function() { return false; };
    
    this.$nextTick(() => {
      this.setPadding();
    });
  },
  computed: {
    computedId() {
      return this.$store.state.route.params.id;
    },
    loggedIn() {
      return this.$store.state.isUserLoggedIn;
    },
    numAttrValues() {
      return this.logical.attributes[0].values.length;
    },
    numAttributes() {
      return this.logical.attributes.length;
    },
    blockWidth() {
      return this.numAttrValues * this.cellWidth;
    },
    svgWidth() {
      const margin = 20;
      return this.paddingLeft + margin + (this.numAttributes - 1) * this.blockWidth;
    },
    svgHeight() {
      const margin = 20;
      return this.paddingTop + margin + (this.numAttributes - 1) * this.blockWidth;
    },
  },
  methods: {
    async checkIfAlreadySolved() {
      // New request in case the user solved the puzzle since logging in
      const userData = (await UserService.show(this.$store.state.user.id)).data;
      const logicalId = parseInt(this.$store.state.route.params.id, 10) - 1;
      this.alreadySolved = userData.solvedLogicals.includes(logicalId);
    },
    setPadding() {
      this.gridState = new Array((this.numAttributes * (this.numAttributes + 1)) / 2 * this.numAttrValues * this.numAttrValues).fill(2);
      // console.log("Jo", this.$refs.horizontalLabels);
      if (this.$refs.horizontalLabels != null && this.$refs.verticalLabels != null) {
        // console.log("Ho Ve not null");
        let maxLabelWidth = 0;
        for(let label of this.$refs.horizontalLabels) {
          maxLabelWidth = Math.max(maxLabelWidth, label.getBBox().width);
        }
        let maxLabelHeight = 0;
        for(let label of this.$refs.verticalLabels) {
          maxLabelHeight = Math.max(maxLabelHeight, label.getBBox().height);
        }
        this.paddingLeft = maxLabelWidth + 10;
        this.paddingTop = maxLabelHeight + 10;
      }
    },
    async setRating(logicalId) {
      if (this.$store.state.user != null) {
        const res = await LogicalRatingService.show(logicalId);
        this.rating = res.data.rating;
      }
    },
    revertState() {
      if (this.revertIndex > 0) {
        const state = this.revertHistory[this.revertIndex - 1];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            const [i, j, k] = this.toIJK(b, a);
            const cellIndex = this.cellIndex(i, j, k);
            this.$set(this.gridState, cellIndex, state['colorsBefore'][b - state['x0']][a - state['y0']]);
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
            const [i, j, k] = this.toIJK(b, a);
            const cellIndex = this.cellIndex(i, j, k);
            this.$set(this.gridState, cellIndex, state['colorAfter']);
          }
        }
        this.revertIndex += 1;
      }
    },
    checkSolution() {
      this.solved = true;
      for(let i = 0; i < this.logical.solution.length; i++) {
        for(let j = 1; j < this.logical.solution[i].length; j++) {
          if (this.attrInputs[`${i}_${j - 1}`] == null) {
            this.solved = false;
            this.solveLabel = "Es sind Attribute noch nicht zugewiesen!";
            return;
          }
          if (this.logical.solution[i][j] != this.attrInputs[`${i}_${j - 1}`]) {
            this.solved = false;
          }
        }
      }
      if (this.solved) {
        if (!this.alreadySolved) {
          this.saveSolvedLogical();
        }
        this.solveLabel = "Gratulation, das Rätsel ist gelöst!";
      } else {
        this.solveLabel = "Es existieren noch Fehler!";
      }
    },
    async saveSolvedLogical() {
      const userId = this.$store.state.user.id;
      const logicalId = parseInt(this.$store.state.route.params.id, 10) - 1;
      const isSuccess = await UserService.logicalSolved(userId, logicalId);
      // TODO do something if riddle couldn't be saved
      console.log("Suc", isSuccess);
    },
    toXY(i, j, k) {
      // i = row, j = column (block), k = cell in nxn block
      const x = (j - 1) * this.numAttrValues + Math.floor((k - 1) / this.numAttrValues);
      const y = (i - 1) * this.numAttrValues + (k - 1) % this.numAttrValues;
      return [x, y];
    },
    toIJK(x, y) {
      const i = Math.floor(y / this.numAttrValues);
      const j = Math.floor(x / this.numAttrValues);
      if (j >= this.numAttributes - 1 - i) {
        // block not in grid
        return [-1, -1, -1];
      }
      const k = (x % this.numAttrValues) * this.numAttrValues + (y % this.numAttrValues);
      return [i + 1, j + 1, k + 1];
    },
    mouseDown(i, j, k) {
      const [x, y] = this.toXY(i, j, k);
      // create a copy of the grid state before the mouse down
      this.gridStateCopy = [...this.gridState];
      this.startMouseDown = [x, y];
      this.lastMouseOver = this.startMouseDown;
      this.isMouseDown = true;
      this.$set(this.gridState, this.cellIndex(i, j, k), this.selectedColor);
    },
    mouseEnter(i, j, k) {
      if (this.isMouseDown) {
        const [i1, j1] = this.toXY(i, j, k);
        const [i2, j2] = this.startMouseDown;
        const [i3, j3] = this.lastMouseOver;
        // first reset not marked cells
        if (i1 !== i3) {
          for (let x = Math.min(i1, i3); x <= Math.max(i1, i3); x++) {
            for (let y = Math.min(j2, j3); y <= Math.max(j2, j3); y += 1) {
              const [i, j, k] = this.toIJK(x, y);
              if (i != -1) {
                const cellIndex = this.cellIndex(i, j, k);
                this.$set(this.gridState, cellIndex, this.gridStateCopy[cellIndex]);
              }
            }
          }
        }
        if (j1 !== j3) {
          for (let y = Math.min(j1, j3); y <= Math.max(j1, j3); y++) {
            for (let x = Math.min(i2, i3); x <= Math.max(i2, i3); x += 1) {
              const [i, j, k] = this.toIJK(x, y);
              if (i != -1) {
                const cellIndex = this.cellIndex(i, j, k);
                // this.gridCells[ind].style.background = this.colors[this.gridState[ind]];
                this.$set(this.gridState, cellIndex, this.gridStateCopy[cellIndex]);
              }
            }
          }
        }
        // then mark nearly marked cells
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a += 1) {
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b += 1) {
            // this.gridCells[b * this.width + a].style.background = this.colors[this.selectedColor];
            const [i, j, k] = this.toIJK(a, b);
            if (i != -1) {
              const cellIndex = this.cellIndex(i, j, k);
              this.$set(this.gridState, cellIndex, this.selectedColor);
            }
          }
        }
        this.lastMouseOver = [i1, j1];
      }
    },
    mainGridMouseUp() {
      if (this.isMouseDown) {
        this.isMouseDown = false;
        const [i1, j1] = this.startMouseDown;
        const [i2, j2] = this.lastMouseOver;
        const stateBefore = [];
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          const stateBeforeRow = [];
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            const [i, j, k] = this.toIJK(a, b);
            if (i != -1) {
              const cellIndex = this.cellIndex(i, j, k);
              stateBeforeRow.push(this.gridStateCopy[cellIndex]);
              this.gridState[cellIndex] = this.selectedColor;
            }
          }
          stateBefore.push(stateBeforeRow);
        }
        const revertObj = {
          'x0': Math.min(i1, i2),
          'x1': Math.max(i1, i2),
          'y0': Math.min(j1, j2),
          'y1': Math.max(j1, j2),
          'colorAfter': this.selectedColor,
          'colorsBefore': stateBefore
        }
        
        if (this.revertIndex < this.revertHistory.length) {
          this.revertHistory[this.revertIndex] = revertObj;
          this.revertHistory.length = this.revertIndex + 1;
        } else {
          this.revertHistory.push(revertObj);
        }
        this.revertIndex += 1;
      }
    },
    drawOutline() {
      // draw horizontal lines
      let pathStr = `M0 0H${this.blockWidth * (this.numAttributes - 1)}`;
      for(let i = 0; i < this.numAttributes - 1; i++){
          pathStr += `M0 ${this.blockWidth * (i + 1)}H${this.blockWidth * (this.numAttributes - 1 - i)}`;
      }
      // draw vertical lines
      pathStr += `M0 0V${this.blockWidth * (this.numAttributes - 1)}`;
      for(let i = 0; i < this.numAttributes - 1; i++){
          pathStr += `M${this.blockWidth * (i + 1)} 0V${this.blockWidth * (this.numAttributes - 1 - i)}`;
      }
      return pathStr;
    },
    setCell(i, j, k) {
      const index = this.cellIndex(i, j, k);
      this.$set(this.gridState, index, this.selectedColor);
      // if a cross is set, consider it for the solution
      const row = (k - 1) % this.numAttrValues;
      if (this.selectedColor == 0) {
        if (i == 1) {
          this.attrInputs[`${row}_${j - 1}`] = this.attributes[j].values[Math.floor((k - 1) / this.numAttrValues)];
        }
      }
    },
    cellIndex(i, j, k) {
      // i: y pos of block group of size (numAttrValues * numAttrValues)
      // j: x pos of block group
      // k: index in block group
      let index = 0;
      for(let c = 0; c < i - 1; c++) {
        index += this.numAttributes - 1 - c;
      }
      return (index + j - 1) * this.numAttrValues * this.numAttrValues + (k - 1);
    },
    selectColor(i) {
      this.selectedColor = i;
    }
  },
};
</script>

<style lang="scss">
$logicalColor: #c6c6c6; /* #78c0fa; #fe4f6c*/
$textColor: black; /*white;*/

h1 {
  margin-bottom: 30px;
  font-size: 26px;
}

.responsive-table, #solutionGridNonCanvas, #nonoMainArea {
  overflow-x: overlay;
}

#descrHeader {
  margin-top: 0;
}

.puzzleTitle {
  float: left;
}

.difficulty {
  float: right;
  font-size: 22px;
}

#solutionGrid {
  margin: 30px 0;
}

.crossPath {
  pointer-events: none;
}

.verticalTextGroup text {
  writing-mode: tb;
}

.blockGroups {
  pointer-events: all;
}

#headerImage {
  /* position: absolute;
  right: 30px;
  top: 30px; */
  width: 1000px;
  height: 200px;
  object-fit: cover;
}

.puzzleContainer {
  /* background: white; */
  overflow: hidden;
  border-radius: 10px;
  margin-top: 20px;
  margin-bottom: 20px;
  position: relative;
  border: 1px solid rgba(188, 188, 188, 0.08);
  display: inline-block;
  width: 100%;
}

.puzzleBody {
  position: relative;
  padding: 30px;
  background: #ffffffab;
  box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 2px 0px;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

#puzzleHeader {
  background: #ffffff;
  background: #f5f5f5;
  height: 37px;
  line-height: 35px;
  padding: 10px 30px;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

#puzzleHeader h1 {
  margin: 0;
  font-size: 22px;
}

#clues {
  margin: 20px 0;
  padding: 1em;
  padding-left: 2em;
  /* background-color: $logicalColor; */
  background: #f5f5f5;
  box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 2px 0px;
  /* box-shadow: 0px 0px 20px 3px rgb(211, 211, 211);
  box-shadow: 0 2px 6px rgba(154,153,153,0.75); */
  color: $textColor;
  border-radius: 4px;
}

.bold {
  font-weight: bold;
}

.clue {
  margin-bottom: 10px;
}

.clue:last-child {
 margin-bottom: 0px;
}

thead {
  background: white;
}

tbody{
  th {
    color: #5e5d52;
  }
  tr {
    margin-bottom: 1em;
  }
  td {
    padding: 8px 10px;
  }
}

th, td {
  text-align: center;
  vertical-align: middle;
}

th {
  color: $textColor;
  padding: 8px 10px;
  font-weight: normal;
}

table {
  white-space: nowrap;
  border-collapse: separate;
  border-spacing: 0;
  margin: 20px 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

thead th:first-child {
  border-top-left-radius: 8px;
}

thead th:last-child {
  border-top-right-radius: 8px;
}

table tr:last-child td:first-child {
  border-bottom-left-radius: 8px;
}

table tr:last-child td:last-child {
  border-bottom-right-radius: 8px;
}

tbody tr:nth-child(2n-1) {
  background-color: #f5f5f5;
}

tbody tr:nth-of-type(even) {
  background-color: rgb(236, 235, 234);
}

input {
  padding: 9px;
  box-sizing: border-box;
  height: 30px;
}

button {
  color: black;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 5px;
  height: 40px;
  padding: 10px;
  border: none;
  cursor: pointer;

  &:hover {
    background: #c6c6c6;
  }
}

.checking {
  display: inline-block;
  vertical-align: middle;
  margin-left: 10px;
}
.solutionToggle {
  display: inline-block;
  vertical-align: middle;
  margin-left: 10px;
}

ul {
  margin-block-start: 5px;
}
</style>
