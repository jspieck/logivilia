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
          <MySelect :options='difficulties' :sel="logical.difficulty" v-model='logical.difficulty'/>
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
          <MySelect :options='attrValNumberOptions' :sel="numAttributeValues" @input='setAttributeValNumber'/>
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
                        <MySelect :options='transformValues(logical.attributes[j + 1].values)' v-model='attrInputs[i + "_" + j]'/>
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
import { ref, computed, onMounted } from 'vue';
import { watch, nextTick } from 'vue';
import Toggle from './Toggle';
import MySelect from './MySelect';
import LogicalService from '@/services/LogicalService';
import draggable from 'vuedraggable';

export default {
  name: 'LogicalCreate',
  components: {
    Toggle,
    MySelect,
    draggable
  },
  props: ['id'],
  setup(props) {
    const revertHistory = ref([])
    const revertIndex = ref(0)
    const attrInputs = ref({})
    const solved = ref(false)
    const gridState = ref([])
    const gridStateCopy = ref([])
    const cellWidth = ref(25)
    const paddingLeft = ref(50)
    const paddingTop = ref(50)
    const tableVisible = ref(true)
    const selectedColor = ref(0)
    const colors = ref(["#fff", "#333", "#fff"])
    const solveLabel = ref("")
    const difficulties = ref([1, 2, 3, 4, 5])
    const attrValNumberOptions = ref([2, 3, 4, 5, 6, 7, 8, 9, 10])
    const numAttributeValues = ref(2)
    const preview = ref(true)

    const startMouseDown = ref([0, 0]);
    const lastMouseOver = ref([0, 0]);
    const isMouseDown = ref(false);
    
    const logical = ref({
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
    });

    const cluesFinished = computed(() => {
      if (logical.value.clues.length == 0) {
        return false;
      }
      for (const clue of logical.value.clues) {
        if (clue.text.length < 10) {
          return false;
        }
      }
      return true;
    });

    const solutionFinished = computed(() => {
      const names = new Set();
      for (const attr of logical.value.attributes) {
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
      if (names.size != logical.value.attributes.length) {
        return false;
      }
      return true;
    });

    const riddleFinished = computed(() => {
      let finished = true;
      finished &= nameFinished.value;
      finished &= descriptionFinished.value;
      finished &= questionFinished.value;
      finished &= cluesFinished.value;
      finished &= solutionFinished.value;
      return finished;
    });
    const numAttributes = computed(() => logical.value.attributes.length);
    const numAttrValues = computed(() => {
      if (logical.value.attributes.length == 0) {
        return 0;
      }
      return logical.value.attributes[0].values.length;
    });
    const blockWidth = computed(() =>{
      return numAttrValues.value * cellWidth.value;
    });
    const svgWidth = computed(() => {
      const margin = 20;
      return paddingLeft.value + margin + (numAttributes.value - 1) * blockWidth.value;
    });
    const svgHeight = computed(() => {
      const margin = 20;
      return paddingTop.value + margin + (numAttributes.value - 1) * blockWidth.value;
    });

    onMounted(() => {
      gridState.value = new Array((numAttributes.value * (numAttributes.value + 1)) / 2 * numAttrValues.value * numAttrValues.value).fill(2);
      let maxLabelWidth = 0;
      for(let label of this.$refs.horizontalLabels) {
        maxLabelWidth = Math.max(maxLabelWidth, label.getBBox().width);
      }
      let maxLabelHeight = 0;
      for(let label of this.$refs.verticalLabels) {
        maxLabelHeight = Math.max(maxLabelHeight, label.getBBox().height);
      }
      paddingLeft.value = maxLabelWidth + 10;
      paddingTop.value = maxLabelHeight + 10;

      document.addEventListener("mouseup", mainGridMouseUp, false);
      window.ondragstart = function() { return false; };
    });

    const removeAttribute = (i) => {
      if (logical.value.attributes.length > 2) {
        this.$buefy.modal.open({
          title: 'Attribut löschen',
          message: 'Willst du das Attribut wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
          cancelText: 'Nicht löschen',
          confirmText: 'Löschen',
          type: 'is-danger',
          hasIcon: true,
          onConfirm: () => {
            this.$buefy.toast.open({
              message: 'Attribut gelöscht!',
              duration: 2000
            })
            logical.value.attributes.splice(i, 1)
          }
        })
      } else {
        this.$buefy.toast.open({
          message: 'Es muss mindestens drei Attribute geben, damit eins gelöscht werden kann!',
          duration: 2000,
          type: 'is-warning'
        })
      }
    }

    const addAttribute = () => {
      const attrValues = []
      for (let i = 0; i < numAttributeValues.value; i += 1) {
        attrValues.push({name: ""})
      }
      logical.value.attributes.push({
        "name": "",
        "values": attrValues
      })
    }

    const createLogical = async () => {
      try {
        if (riddleFinished.value) {
          const flattenedAttributes = []
          for (const attr of logical.value.attributes) {
            const flatAttr = {name: attr.name}
            flatAttr.values = attr.values.map(v => v.name)
            flattenedAttributes.push(flatAttr)
          }
          
          const logicalData = {
            name: logical.value.name,
            solution: solution.value,
            difficulty: logical.value.difficulty,
            description: logical.value.description,
            question: logical.value.question,
            clues: logical.value.clues,
            attributes: flattenedAttributes,
            image: "",
            date: new Date().toISOString().slice(0, 10),
            author: logical.value.author
          }
          
          await LogicalService.post(logicalData)
          this.$buefy.toast.open({
            message: 'Logikrätsel erfolgreich erstellt!',
            duration: 2000,
            type: 'is-success'
          })
        }
      } catch(err) {
        console.error(err)
        this.$buefy.toast.open({
          message: 'Fehler beim Erstellen des Logikrätsels',
          duration: 2000,
          type: 'is-danger'
        })
      }
    }

    const padSolutionGrid = () => {
      if (this.$refs.horizontalLabels != null && this.$refs.verticalLabels != null) {
        let maxLabelWidth = 0;
        for(let label of this.$refs.horizontalLabels) {
          maxLabelWidth = Math.max(maxLabelWidth, label.getBBox().width);
        }
        let maxLabelHeight = 0;
        for(let label of this.$refs.verticalLabels) {
          maxLabelHeight = Math.max(maxLabelHeight, label.getBBox().height);
        }
        paddingLeft.value = maxLabelWidth + 10;
        paddingTop.value = maxLabelHeight + 10;
      }
    };

    const transformValues =(values) => {
      return values.map((x) => x.name); 
    };

    const setAttributeValNumber = (valNumber) => {
      for (const at of logical.value.attributes) {
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
      numAttributeValues.value = parseInt(valNumber);
    };

    /* const updateDifficulty = (diff) => {
      logical.value.difficulty = diff;
    }; */

    const removeClue = (idx) => {
      logical.value.clues.splice(idx, 1);
    };

    const addClue = () => {
      logical.value.clues.push({
        "id": logical.value.clues.length,
        "text": ""
      });
    };

    const revertState = () => {
      if (revertIndex.value > 0) {
        const state = revertHistory[revertIndex.value - 1];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            const [i, j, k] = toIJK(b, a);
            const cellIndex = cellIndex(i, j, k);
            this.$set(gridState, cellIndex, state['colorsBefore'][b - state['x0']][a - state['y0']]);
          }
        }
        revertIndex.value -= 1;
      }
    };

    const restoreState = () => {
      if (revertIndex.value < revertHistory.value.length) {
        const state = revertHistory[revertIndex];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            const [i, j, k] = toIJK(b, a);
            const cellIndex = cellIndex(i, j, k);
            this.$set(gridState, cellIndex, state['colorAfter']);
          }
        }
        revertIndex.value += 1;
      }
    };

    const checkSolution = () => {
      solved.value = true;
      for(let i = 0; i < solution.value.length; i++) {
        for(let j = 1; j < solution[i].length; j++) {
          if (attrInputs[`${i}_${j - 1}`] == null) {
            solved.value = false;
            solveLabel.value = "Es sind Attribute noch nicht zugewiesen!";
            return;
          }
          if (solution[i][j] != attrInputs[`${i}_${j - 1}`]) {
            solved.value = false;
          }
        }
      }
      if (solved.value) {
        solveLabel.value = "Gratulation, das Rätsel ist gelöst!";
      } else {
        solveLabel.value = "Es existieren noch Fehler!";
      }
    };

    const toXY = (i, j, k) => {
      // i = row, j = column (block), k = cell in nxn block
      const x = (j - 1) * numAttrValues.value + Math.floor((k - 1) / numAttrValues.value);
      const y = (i - 1) * numAttrValues.value + (k - 1) % numAttrValues.value;
      return [x, y];
    };

    const toIJK = (x, y) => {
      const i = Math.floor(y / numAttrValues.value);
      const j = Math.floor(x / numAttrValues.value);
      if (j >= numAttributes.value - 1 - i) {
        // block not in grid
        return [-1, -1, -1];
      }
      const k = (x % numAttrValues.value) * numAttrValues.value + (y % numAttrValues.value);
      return [i + 1, j + 1, k + 1];
    };

    const mouseDown = (i, j, k) => {
      const [x, y] = toXY(i, j, k);
      // create a copy of the grid state before the mouse down
      gridStateCopy.value = [...gridState];
      startMouseDown.value = [x, y];
      lastMouseOver.value = startMouseDown.value;
      isMouseDown.value = true;
      this.$set(gridState, cellIndex(i, j, k), selectedColor);
    };

    const mouseEnter = (i, j, k) => {
      if (isMouseDown.value) {
        const [i1, j1] = toXY(i, j, k);
        const [i2, j2] = startMouseDown;
        const [i3, j3] = lastMouseOver;
        // first reset not marked cells
        if (i1 !== i3) {
          for (let x = Math.min(i1, i3); x <= Math.max(i1, i3); x++) {
            for (let y = Math.min(j2, j3); y <= Math.max(j2, j3); y += 1) {
              const [i, j, k] = toIJK(x, y);
              if (i != -1) {
                const cellIndex = cellIndex(i, j, k);
                this.$set(gridState, cellIndex, gridStateCopy[cellIndex]);
              }
            }
          }
        }
        if (j1 !== j3) {
          for (let y = Math.min(j1, j3); y <= Math.max(j1, j3); y++) {
            for (let x = Math.min(i2, i3); x <= Math.max(i2, i3); x += 1) {
              const [i, j, k] = toIJK(x, y);
              if (i != -1) {
                const cellIndex = cellIndex(i, j, k);
                // gridCells[ind].style.background = colors[gridState[ind]];
                this.$set(gridState, cellIndex, gridStateCopy[cellIndex]);
              }
            }
          }
        }
        // then mark nearly marked cells
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a += 1) {
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b += 1) {
            // gridCells[b * width + a].style.background = colors[selectedColor];
            const [i, j, k] = toIJK(a, b);
            if (i != -1) {
              const cellIndex = cellIndex(i, j, k);
              this.$set(gridState, cellIndex, selectedColor);
            }
          }
        }
        lastMouseOver.value = [i1, j1];
      }
    };

    const mainGridMouseUp = () => {
      if (isMouseDown.value) {
        isMouseDown.value = false;
        const [i1, j1] = startMouseDown;
        const [i2, j2] = lastMouseOver;
        const stateBefore = [];
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          const stateBeforeRow = [];
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            const [i, j, k] = toIJK(a, b);
            if (i != -1) {
              const cellIndex = cellIndex(i, j, k);
              stateBeforeRow.push(gridStateCopy[cellIndex]);
              gridState[cellIndex] = selectedColor;
            }
          }
          stateBefore.push(stateBeforeRow);
        }
        const revertObj = {
          'x0': Math.min(i1, i2),
          'x1': Math.max(i1, i2),
          'y0': Math.min(j1, j2),
          'y1': Math.max(j1, j2),
          'colorAfter': selectedColor,
          'colorsBefore': stateBefore
        }
        
        if (revertIndex.value < revertHistory.value .length) {
          revertHistory[revertIndex] = revertObj;
          revertHistory.value .length = revertIndex.value  + 1;
        } else {
          revertHistory.value .push(revertObj);
        }
        revertIndex.value  += 1;
      }
    };

    const drawOutline = () => {
      // draw horizontal lines
      let pathStr = `M0 0H${blockWidth.value * (numAttributes.value - 1)}`;
      for(let i = 0; i < numAttributes.value - 1; i++){
          pathStr += `M0 ${blockWidth.value * (i + 1)}H${blockWidth.value * (numAttributes.value - 1 - i)}`;
      }
      // draw vertical lines
      pathStr += `M0 0V${blockWidth.value * (numAttributes.value - 1)}`;
      for(let i = 0; i < numAttributes.value - 1; i++){
          pathStr += `M${blockWidth.value * (i + 1)} 0V${blockWidth.value * (numAttributes.value - 1 - i)}`;
      }
      return pathStr;
    };

    const setCell = (i, j, k) => {
      const index = cellIndex(i, j, k);
      this.$set(gridState, index, selectedColor);
      // if a cross is set, consider it for the solution
      const row = (k - 1) % numAttrValues.value;
      if (selectedColor.value == 0) {
        if (i == 1) {
          attrInputs[`${row}_${j - 1}`] = logical.value.attributes[j].values[Math.floor((k - 1) / numAttrValues.value)];
        }
      }
    };

    const cellIndex = (i, j, k) => {
      // i: y pos of block group of size (numAttrValues * numAttrValues)
      // j: x pos of block group
      // k: index in block group
      let index = 0;
      for(let c = 0; c < i - 1; c++) {
        index += numAttributes.value - 1 - c;
      }
      return (index + j - 1) * numAttrValues.value * numAttrValues.value + (k - 1);
    };

    const selectColor = (i) => {
      selectedColor.value = i;
    };

    watch(() => props.id, async () => {
      gridState.value = new Array(
        (numAttributes.value * (numAttributes.value + 1)) / 2 * 
        numAttrValues.value * 
        numAttrValues.value
      ).fill(2)
      
      await nextTick()
      if (this.$refs.horizontalLabelsRef && this.$refs.verticalLabelsRef) {
        let maxLabelWidth = 0
        for (let label of this.$refs.horizontalLabelsRef) {
          maxLabelWidth = Math.max(maxLabelWidth, label.getBBox().width)
        }
        
        let maxLabelHeight = 0
        for (let label of this.$refs.verticalLabelsRef) {
          maxLabelHeight = Math.max(maxLabelHeight, label.getBBox().height)
        }
        
        paddingLeft.value = maxLabelWidth + 10
        paddingTop.value = maxLabelHeight + 10
      }
    })

    watch(tableVisible, async () => {
      await nextTick()
      padSolutionGrid()
    })

    watch(computedAttributes, async () => {
      await nextTick()
      padSolutionGrid()
    }, { deep: true })

    const computedAttributes = computed(() => logical.value.attributes);
    const nameFinished = computed(() => logical.value.name != "");
    const descriptionFinished = computed(() => logical.value.description.length > 20);
    const questionFinished = computed(() => logical.value.question.length > 20);
    const solution = computed(() => {
      const sol = [];
      for (let i = 0; i < numAttributeValues.value; i += 1) {
        const solRow = [];
        for (const attr of logical.value.attributes) {
          solRow.push(attr.values[i].name);
        }
        sol.push(solRow);
      }
      return sol;
    });

    return {
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
      difficulties,
      attrValNumberOptions,
      numAttributeValues,
      preview,
      logical,
      removeAttribute,
      addAttribute,
      createLogical,
      riddleFinished,
      selectColor,
      setCell,
      drawOutline,
      checkSolution,
      transformValues,
      setAttributeValNumber,
      removeClue,
      addClue,
      revertState,
      mouseDown,
      svgWidth,
      svgHeight,
      restoreState,
      mouseEnter
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
