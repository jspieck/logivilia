<template>
<div>
  <h2>Logikrätsel erstellen</h2>
  <div id="wrapMe" class="wrapMe">
    <label>Rätselvorschau:</label>
    <Toggle class="solutionToggle" v-model="preview"/>
  </div>
  <div class="columns">
    <div :class="preview ? ['column', 'is-one-third'] : 'column'">
      <div class="puzzleSet">
        <b-field label="Name des Rätsels">
          <input v-model="logical.name"/>
        </b-field>
        <p class="error" v-if="!nameFinished">Bitte einen Namen für das Rätsel festlegen.</p>
        <b-field label="Schwierigkeit">
          <MSelect :options='difficulties' :sel="logical.difficulty" v-model='logical.difficulty'/>
        </b-field>
        <b-field label="Beschreibung">
          <textarea v-model="logical.description" placeholder="Leiten Sie zum Thema des Rätsels hin."/>
        </b-field>
        <p class="error" v-if="!descriptionFinished">Bitte das Rätselthema mit mindestens 20 Zeichen beschreiben.</p>
        <b-field label="Frage">
          <textarea v-model="logical.question" placeholder="Beispiel: Wer (Vorname und Nachname) mag welche Obstsorte?"/>
        </b-field>
        <p class="error" v-if="!questionFinished">Bitte eine Rätselfrage mit mindestens 20 Zeichen stellen.</p>
        <b-field label="Hinweise" :addons="false">
          <draggable v-model="logical.clues" group="clues" @start="drag=true" @end="drag=false" handle=".handle">
            <transition-group type="transition" :name="'flip-list'">
              <div v-for="[i, clue] in logical.clues.entries()" v-bind:key="`clue${i}`" class="clue">
                <i class="fa fa-align-justify handle"></i>
                <textarea v-model="clue.text" class="clueInput"/>
                <i class="fa fa-times close" @click="removeClue(i)"></i>
              </div>
            </transition-group>
          </draggable>
          <button @click="addClue">Neuer Hinweis</button>
        </b-field>
        <p class="error" v-if="!cluesFinished">Bitte mindestens einen Hinweis geben. Jeder Hinweis muss mindestens 10 Zeichen lang sein.</p>
        <b-field label="Lösung" :addons="false">
          <p>Anzahl an Attributwerten:</p>
          <!--<input type="number" @input="setAttributeValNumber"/>-->
          <MSelect :options='attrValNumberOptions' :sel="numAttributeValues" @input='setAttributeValNumber'/>
          <table class="attributeTable">
            <!-- All the attribute names -->
            <tr>
              <td>Attributname</td>
              <td v-for="[i, attr] in logical.attributes.entries()" v-bind:key="'attrN' + i">
                <input v-model="attr.name"/>
              </td>
            </tr>
            <!-- All the attribute values -->
            <tr v-for="i in numAttributeValues" v-bind:key="'attrR' + i">
              <td><p>Attributgruppe {{i}}</p></td>
              <td v-for="[j, attr] in logical.attributes.entries()" v-bind:key="'attrVal' + i + ' ' + j">
                <!--<p>{{attr.values[i - 1]}}</p>-->
                <input v-model='attr.values[i - 1].name'/>
              </td>
            </tr>
            <tr>
              <td></td>
              <td v-for="i in logical.attributes.length" v-bind:key="`attrDel${i}`">
                <i class="fa fa-times delAttr" @click="removeAttribute(i - 1)"></i>
              </td>
            </tr>
          </table>
          <button @click="addAttribute">Neues Attribut</button>
        </b-field>
        <p class="error" v-if="!solutionFinished">Bitte alle Attributgruppen ausfüllen und unterscheidbar benennen.</p>
        <!-- <b-field label="Lösung">
          <input v-model="logical.solution"/>
        </b-field> -->
        <!--<b-field label="Bildpfad">
          <input v-model="logical.image"/>
        </b-field>-->
        <b-field label="Autor">
          <input v-model="logical.author"/>
        </b-field>
        <button @click="createLogical">Rätsel erstellen</button>
      </div>
    </div>
    <div class="column" v-if="preview">
      <div class="puzzlePreview">
        <div class="puzzleContainer" v-if="logical != null">
          <div id="puzzleHeader">
            <h1 class="puzzleTitle">{{logical.name}}</h1>
            <span class="difficulty">{{logical.difficulty}}/<strong>5</strong></span>
          </div>
          <div id="puzzle" class="puzzleBody">
            <h3 id="descrHeader">Beschreibung</h3>
            <p id="description">{{logical.description}}</p>
            <label class="logicalQuestion"><strong>{{logical.question}}</strong></label>
            <h3>Hinweise</h3>
            <ol id="clues">
              <li v-for="[i, clue] in logical.clues.entries()" v-bind:key='`clueActual${i}`' class="clue">{{clue.text}}</li>
            </ol>
            <label class="bold">Attribute</label>
            <ul id="attrList">
              <li v-for="[i, attr] in logical.attributes.entries()" v-bind:key='`realAtr${i}`'>
                <div class="attrRow">
                  <strong>{{attr.name}}: </strong>
                  <span v-for="[j, v] in attr.values.entries()" v-bind:key='`realAt${j}`'>
                    {{v.name}}<span v-if="j != attr.values.length - 1">, </span>
                  </span>
                </div>
              </li>
            </ul>
            <h3>Lösung</h3>
            <div class="eitherOr">
              <div id="wrapMe" class="wrapMe">
                <label id="nummerierung">Zeige die erweiterte Tabelle:</label>
                <Toggle class="solutionToggle" v-model="tableVisible"/>
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
                  <button id="revert" @click="revertState" class="nonoButton"><ion-icon class="rotate" v-pre name="ios-refresh"></ion-icon></button>
                  <button id="restore" @click="restoreState" class="nonoButton"><ion-icon v-pre name="ios-refresh"></ion-icon></button>
                </div>
                <div id="classicGrid" class="gridContainer">
                  <div id="solutionGridNonCanvas">
                    <svg :width="svgWidth" :height="svgHeight">
                      <g v-for="[i, attr] in (logical.attributes.slice(0, 1).concat(logical.attributes.slice(2, logical.attributes.length))).entries()"
                      :transform="`translate(0, ${paddingTop + i * numAttrValues * cellWidth})`"
                      v-bind:key='`hgroup${i}`' class="horizontalTextGroup">
                        <text v-for="[j, val] in attr.values.entries()" ref="horizontalLabels" v-bind:key='`htext${j}`' x="0"
                        :y="j * cellWidth + cellWidth / 2 + 2">{{val.name}}</text>
                      </g>
                      <g v-for="[i, attr] in logical.attributes.slice(1, logical.attributes.length).entries()"
                      :transform="`translate(${paddingLeft + i * numAttrValues * cellWidth}, 0)`"
                      v-bind:key='`vgroup${i}`' class="verticalTextGroup">
                        <text v-for="[j, val] in attr.values.entries()" ref="verticalLabels" v-bind:key='`vtext${j}`' y="0"
                        :x="j * cellWidth + cellWidth / 2 + 2">{{val.name}}</text>
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
                      <th v-for="[i, attr] in logical.attributes.entries()" v-bind:key='`tableAttr${i}`' scope='col' class='tableH'>
                        {{attr.name}}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="[i, v] in logical.attributes[0].values.entries()" v-bind:key='`tabAttrRow${i}`'>
                      <td scope='row'>{{v.name}}</td>
                      <td v-for="[j, attr] in logical.attributes.slice(1).entries()"
                        v-bind:key='`tableCell${i}_${j}`' :data-title='attr.name'>
                        <MSelect :options='transformValues(logical.attributes[j + 1].values)' v-model='attrInputs[i + "_" + j]'/>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script>
import Toggle from './Toggle';
import Select from './Select';
import LogicalService from '@/services/LogicalService';
import draggable from 'vuedraggable';

export default {
  name: 'LogicalCreate',
  props: ['id'],
  components: {
    Toggle,
    MSelect: Select,
    draggable,
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
      difficulties: [1, 2, 3, 4, 5],
      attrValNumberOptions: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      numAttributeValues: 2,
      logical: {
        name: "",
        difficulty: 1,
        description: "",
        question: "",
        clues: [],
        attributes: [
          {"name": "", "values": [{name: ""}, {name: ""}]},
          {"name": "", "values": [{name: ""}, {name: ""}]}
        ],
        image: "",
        date: "",
        author: ""
      },
      preview: true,
    };
  },
  watch: {
    id() {
      this.gridState = new Array((this.numAttributes * (this.numAttributes + 1)) / 2 * this.numAttrValues * this.numAttrValues).fill(2);
      this.$nextTick(() => {
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
      });
    },
    tableVisible() {
      this.$nextTick(() => {
        this.padSolutionGrid();
      });
    },
    computedAttributes: {
      deep: true,
      handler() {
        // console.log("Handler called");
        this.$nextTick(() => {
          this.padSolutionGrid();
        });
      }
    },
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
    this.paddingLeft = maxLabelWidth + 10;
    this.paddingTop = maxLabelHeight + 10;

    document.addEventListener("mouseup", this.mainGridMouseUp, false);
    window.ondragstart = function() { return false; };
  },
  computed: {
    computedAttributes() {
      // just to trigger a watch for svg text measuring
      return this.logical.attributes;
    },
    solution() {
      const sol = [];
      for (let i = 0; i < this.numAttributeValues; i += 1) {
        const solRow = [];
        for (const attr of this.logical.attributes) {
          solRow.push(attr.values[i].name);
        }
        sol.push(solRow);
      }
      return sol;
    },
    nameFinished() {
      return this.logical.name != "";
    },
    descriptionFinished() {
      return this.logical.description.length > 20;
    },
    questionFinished() {
      return this.logical.question.length > 20;
    },
    cluesFinished() {
      if (this.logical.clues.length == 0) {
        return false;
      }
      for (const clue of this.logical.clues) {
        if (clue.text.length < 10) {
          return false;
        }
      }
      return true;
    },
    solutionFinished() {
      const names = new Set();
      for (const attr of this.logical.attributes) {
        if (attr.name == "") {
          return false;
        }
        names.add(attr.name);
        const valNames = new Set();
        for (const value of attr.values) {
          if (value.name == "") {
            return false;
          }
          valNames.add(value.name);
        }
        if (valNames.size != attr.values.length) {
          return false;
        }
      }
      // Check if names are unique
      if (names.size != this.logical.attributes.length) {
        return false;
      }
      return true;
    },
    riddleFinished() {
      let finished = true;
      finished &= this.nameFinished;
      finished &= this.descriptionFinished;
      finished &= this.questionFinished;
      finished &= this.cluesFinished;
      finished &= this.solutionFinished;
      return finished;
    },
    numAttributes() {
      return this.logical.attributes.length;
    },
    numAttrValues() {
      if (this.logical.attributes.length == 0) {
        return 0;
      }
      return this.logical.attributes[0].values.length;
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
    padSolutionGrid() {
      if (this.$refs.horizontalLabels != null && this.$refs.verticalLabels != null) {
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
    transformValues(values) {
      return values.map((x) => x.name); 
    },
    setAttributeValNumber(valNumber) {
      for (const at of this.logical.attributes) {
        const diff = valNumber - at["values"].length;
        if (diff > 0) {
          for (let i = 0; i < diff; i += 1) {
            at["values"].push({name: ""});
          }
        } else if (diff < 0) {
          for (let i = 0; i < -1 * diff; i += 1) {
            at["values"].pop();
          }
        }
      }
      this.numAttributeValues = parseInt(valNumber);
    },
    updateDifficulty(diff) {
      this.logical.difficulty = diff;
    },
    removeClue(idx) {
      this.logical.clues.splice(idx, 1);
    },
    addClue() {
      this.logical.clues.push({
        "id": this.logical.clues.length,
        "text": ""
      });
    },
    addAttribute() {
      const attrValues = [];
      for (let i = 0; i < this.numAttributeValues; i += 1) {
        attrValues.push({name: ""});
      }
      this.logical.attributes.push({
        "name": "",
        "values": attrValues
      });
    },
    removeAttribute(i) {
      if (this.logical.attributes.length > 2) {
        this.$buefy.dialog.confirm({
          title: 'Attribut löschen',
          message: 'Willst du das Attribut wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
          cancelText: 'Nicht löschen',
          confirmText: 'Löschen',
          type: 'is-danger',
          hasIcon: true,
          onConfirm: () => {
            this.$buefy.toast.open('Attribut gelöscht!');
            this.logical.attributes.splice(i, 1);
          }
        });
      } else {
        this.$buefy.toast.open('Es muss mindestens drei Attribute geben, damit eins gelöscht werden kann!');
      }
    },
    async createLogical() {
      try {
        if (this.riddleFinished) {
          const flattenedAttributes = [];
          for (const attr of this.logical.attributes) {
            const flatAttr = {name: attr.name};
            flatAttr.values = attr.values.map(v => v.name);
            flattenedAttributes.push(flatAttr);
          }
          const logical = {
            name: this.logical.name,
            solution: this.solution,
            difficulty: this.logical.difficulty,
            description: this.logical.description,
            question: this.logical.question,
            clues: this.logical.clues,
            attributes: flattenedAttributes,
            image: "",
            date: new Date().toISOString().slice(0, 10),
            author: this.logical.author,
          };
          await LogicalService.post(logical);
        }
      } catch(err) {
        console.log(err);
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
      for(let i = 0; i < this.solution.length; i++) {
        for(let j = 1; j < this.solution[i].length; j++) {
          if (this.attrInputs[`${i}_${j - 1}`] == null) {
            this.solved = false;
            this.solveLabel = "Es sind Attribute noch nicht zugewiesen!";
            return;
          }
          if (this.solution[i][j] != this.attrInputs[`${i}_${j - 1}`]) {
            this.solved = false;
          }
        }
      }
      if (this.solved) {
        this.solveLabel = "Gratulation, das Rätsel ist gelöst!";
      } else {
        this.solveLabel = "Es existieren noch Fehler!";
      }
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
    getImg() {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      // return require(`@/assets/${this.imgName}`);
      return this.imgPath;
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
          this.attrInputs[`${row}_${j - 1}`] = this.logical.attributes[j].values[Math.floor((k - 1) / this.numAttrValues)];
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

.delAttr {
  width: 100%;
  height: 28px;
  font-size: 18px;
  color: #f66161;
  text-align: center;
  cursor: pointer;
}

#descrHeader {
  margin-top: 0;
}

.bodyContainer {
  background: white;
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

.puzzleSet {
  margin-top: 20px;
}

.puzzleSet input, .puzzleSet textarea {
  width: 100%;
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
  box-shadow: 0 4px 10px #0870b829;
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

.attributeTable td {
  vertical-align: middle;
  padding: 0 10px;
}

thead {
  background: white;
}

#classicGrid {
  margin-top: 10px;
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

textarea {
  font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;
  padding: 5px;
  box-sizing: border-box;
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

.clue {
  position: relative;
  padding: 0 25px;
}

.clueInput {
  resize: vertical;
  overflow: hidden;
}

.handle {
  position: absolute;
  left: 5px;
  top: 50%;
  z-index: 2;
  transform: translate(0, -50%);
}

.close {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translate(0, -50%);
  cursor: pointer;
}

ul {
  margin-block-start: 5px;
}

.error {
  color: red;
}
</style>
