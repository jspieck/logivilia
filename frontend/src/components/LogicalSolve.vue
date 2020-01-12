<template>
<div>
  <div class="puzzleContainer">
    <div id="puzzleHeader">
      <h1 class="puzzleTitle">{{name}}</h1>
      <span class="difficulty">{{difficulty}}/<strong>5</strong></span>
    </div>
    <div id="puzzle" class="puzzleBody">
      <img id='headerImage' :src="getImg()" alt='header image' height='275'/>
      <h3>Beschreibung</h3>
      <p id="description">{{description}}</p>
      <label class="logicalQuestion"><strong>{{logicalQuestion}}</strong></label>
      <h3>Hinweise</h3>
      <ol id="clues">
        <li v-for="clue in clues" v-bind:key='clue' class="clue">{{clue}}</li>
      </ol>
      <label class="bold">Attribute</label>
      <ul id="attrList">
        <li v-for="attr in attributes" v-bind:key='attr.name'>
          <div class="attrRow">
            <strong>{{attr.name}}: </strong>
            <span v-for="[i, v] in attr.values.entries()"
            v-bind:key='v'>{{v}}<span v-if="i != attr.values.length - 1">, </span>
            </span>
          </div>
        </li>
      </ul>
      <h3>Lösung</h3>
      <div class="eitherOr">
        <div id="wrapMe" class="wrapMe">
          <label id="nummerierung">Ändere Lösungsmodus:</label>
          <MToggle class="solutionToggle" v-model="tableVisible"/>
        </div>
        <table v-if="tableVisible" id="solTable" class="dataTable sortable responsive-table">
          <thead>
            <tr>
              <th v-for="attr in attributes" v-bind:key='attr.name' scope='col' class='tableH'>
                {{attr.name}}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[i, v] in attributes[0].values.entries()" v-bind:key='i'>
              <th scope='row'>{{v}}</th>
              <td v-for="[j, attr] in attributes.slice(1).entries()"
                v-bind:key='j' :data-title='attr.name'>
                <MSelect :options='attributes[j + 1].values' v-model='attrInputs[i + "_" + j]'/>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!tableVisible" id="solutionGrid">
          <div id="cDiv">
            <svg id="colors" height="50" width="150">
              <g v-for="[i, color] in colors.entries()" v-bind:key="`color${i}`" :transform="`translate(${5 + i * (cellWidth + 10)}, 5)`">
                <rect :fill="color" stroke="black" :width="cellWidth" :height="cellWidth" @click="selectColor(i)"/>
                <path v-if="i == 0" class="crossPath" :d="`M5 5L${cellWidth - 5} ${cellWidth - 5}M5 ${cellWidth - 5}L${cellWidth - 5} 5`" stroke="#565656"/>
                <rect v-if="selectedColor == i" fill="#f55656" :width="cellWidth" height="3" :y="cellWidth + 4"/> 
              </g>
            </svg>
          </div>
          <div id="classicGrid" class="gridContainer">
            <div id="solutionGridNonCanvas">
              <svg :width="svgWidth" :height="svgHeight">
                <g v-for="[i, attr] in (attributes.slice(0, 1).concat(attributes.slice(2, attributes.length))).entries()"
                :transform="`translate(0, ${paddingTop + i * numAttrValues * cellWidth})`"
                v-bind:key='`hgroup${attr.name}`' class="horizontalTextGroup">
                  <text v-for="[j, val] in attr.values.entries()" ref="horizontalLabels" v-bind:key='`htext${val}`' x="0"
                  :y="j * cellWidth + cellWidth / 2 + 2">{{val}}</text>
                </g>
                <g v-for="[i, attr] in attributes.slice(1, attributes.length).entries()"
                :transform="`translate(${paddingLeft + i * numAttrValues * cellWidth}, 0)`"
                v-bind:key='`vgroup${attr.name}`' class="verticalTextGroup">
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
                        stroke="#c5c5c5" @click="setCell(i, j, k)"/>
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
      </div>
      <div id='checkSolutionBox'>
        <button id='checkButton' class='loes' @click="checkSolution">Check</button>
        <img v-if="!solved" class="checking" src='@/assets/cross.png' width='40' height='40'/>
        <img v-if="solved" class="checking" src='@/assets/haken.png' width='40' height='40'/>
      </div>
      <h4 v-if="solved" id="solved">Gratulation, dieses Rätsel ist gelöst!</h4>
    </div>
  </div>
</div>
</template>

<script>
import Toggle from './Toggle';
import Select from './Select';
import logical from '../assets/logicalTransformed.json';

export default {
  name: 'LogicalSolve',
  components: {
    MToggle: Toggle,
    MSelect: Select,
  },
  data() {
    return {
      name: logical[54].name,
      imgName: 'biene.jpg',
      difficulty: logical[54].difficulty,
      description: logical[54].description,
      logicalQuestion: logical[54].question,
      clues: logical[54].clues,
      attributes: logical[54].attributes,
      solution: logical[54].solution,
      attrInputs: {},
      solved: false,
      gridState: [],
      cellWidth: 25,
      paddingLeft: 50,
      paddingTop: 50,
      tableVisible: false,
      selectedColor: 0,
      colors: ["#fff", "#333", "#fff"],
    };
  },
  mounted() {
    this.gridState = new Array((this.numAttributes * (this.numAttributes + 1)) / 2 * this.numAttrValues * this.numAttrValues).fill(2);
    let maxLabelWidth = 0;
    for(let label of this.$refs.horizontalLabels) {
      maxLabelWidth = Math.max(maxLabelWidth, label.getBBox().width);
    }
    let maxLabelHeight = 0;
    for(let label of this.$refs.verticalLabels) {
      maxLabelHeight = Math.max(maxLabelHeight, label.getBBox().height);
    }
    this.tableVisible = true;
    this.paddingLeft = maxLabelWidth + 10;
    this.paddingTop = maxLabelHeight + 10;
  },
  computed: {
    numAttrValues() {
      return this.attributes[0].values.length;
    },
    numAttributes() {
      return this.attributes.length;
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
    checkSolution() {
      for(let i = 0; i < this.solution.length; i++) {
        for(let j = 1; j < this.solution[i].length; j++) {
          if (this.solution[i][j] != this.attrInputs[`${i}_${j - 1}`]) {
            this.solved = false;
            return;
          }
        }
      }
      this.solved = true;
    },
    getImg() {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      return require(`@/assets/${this.imgName}`);
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
body {
  font-size: 16px;
}

h1 {
  margin-bottom: 30px;
  font-size: 26px;
}

.puzzleTitle {
  float: left;
}

.difficulty {
  float: right;
  font-size: 24px;
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
  position: absolute;
  right: 20px;
  top: 20px;
}

.puzzleContainer {
  /* background: white; */
  overflow: hidden;
  border-radius: 10px;
  margin-top: 20px;
  margin-bottom: 20px;
  position: relative;
}

.puzzleBody {
  position: relative;
  padding: 20px;
  background: #ffffffab;
}

#puzzleHeader {
  /*padding: 10px;*/
  height: 60px;
  width: 100%;
  line-height: 60px;
  border-bottom: 1px solid #262664;
}

#puzzleHeader h1 {
  margin: 0;
  /* margin-left: 10px; */
}

#clues {
  margin: 20px 0;
  padding: 1em;
  padding-left: 2em;
  background-color: #fe4f6c; /* #f5c2c2 #D6EBFF; */
  box-shadow: 0px 0px 20px 3px rgb(211, 211, 211);
  box-shadow: 0 2px 6px rgba(154,153,153,0.75);
  color: white;
  border-radius: 4px;
  width: 60%;
}

.bold {
  font-weight: bold;
}

.clue {
  margin-top: 5px;
}

thead {
  background: #fe4f6c;
  line-height: 1;
  border-radius: .4em;
}

tbody tr {
  margin-bottom: 1em;
  border: 2px solid #1d96b2;
}

tbody{
  th {
    color: #5e5d52;
    text-align: left;
  }
  td {
    padding: 8px 10px;
  }
}

th, td {
  line-height: 13px;
  padding: .5em;
  vertical-align: middle;
}

th {
  color: white;
  padding: 10px;
  text-align: center;
  font-weight: normal;
}

table {
  white-space: nowrap;
  border-collapse: separate;
  border-spacing: 0;
  margin: 20px 0;
}

tbody tr:nth-child(2n-1) {
  background-color: #f5f5f5;
}

tbody tr:nth-of-type(even) {
  background-color: rgba(94, 93, 82, 0.1);
}

input {
  padding: 9px;
  box-sizing: border-box;
  height: 30px;
}

button {
  background: #fe4f6c; /*rgb(52, 73, 94);*/
  color: white;
  border-radius: 5px;
  height: 40px;
  padding: 10px;
  border: none;
  cursor: pointer;
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
