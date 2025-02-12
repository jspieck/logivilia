<template>
  <div class="solvePage">
    <div class="puzzleContainer" v-if="logical != null">
      <div id="puzzleHeader">
        <h1 class="puzzleTitle">{{ logical.name }}</h1>
        <span class="difficulty">{{ logical.difficulty }}/<strong>5</strong></span>
      </div>
      <img id="headerImage" :src="logical.image" alt="header image" width="320" />
      <div id="puzzle" class="puzzleBody">
        <h3 id="descrHeader">Beschreibung</h3>
        <p id="description">{{ logical.description }}</p>
        <label class="logicalQuestion"><strong>{{ logical.question }}</strong></label>
        <h3>Hinweise</h3>
        <ol id="clues">
          <li v-for="(clue, i) in logical.clues" :key="`clueActual${i}`" class="clue">{{ clue }}</li>
        </ol>
        <label class="bold">Attribute</label>
        <ul id="attrList">
          <li v-for="(attr, i) in logical.attributes" :key="`realAtr${i}`">
            <div class="attrRow">
              <strong>{{ attr.name }}: </strong>
              <span v-for="(v, j) in attr.values" :key="`realAt${j}`">
                {{ v }}<span v-if="j != attr.values.length - 1">, </span>
              </span>
            </div>
          </li>
        </ul>
        <h3>Lösung</h3>
        <div class="eitherOr">
          <div id="wrapMe" class="wrapMe">
            <label id="nummerierung">Zeige die erweiterte Tabelle:</label>
            <MToggle class="solutionToggle" v-model="tableVisible" />
          </div>
          <div v-if="tableVisible" id="solutionGrid">
            <div id="cDiv">
              <svg id="colors" height="50" width="150">
                <g v-for="(color, i) in colors" :key="`color${i}`" :transform="`translate(${5 + i * (cellWidth + 10)}, 5)`">
                  <rect :fill="color" stroke="black" :width="cellWidth" :height="cellWidth" @click="selectColor(i)" />
                  <path v-if="i == 0" class="crossPath" :d="`M5 5L${cellWidth - 5} ${cellWidth - 5}M5 ${cellWidth - 5}L${cellWidth - 5} 5`" stroke="#565656" />
                  <rect v-if="selectedColor == i" fill="#f55656" :width="cellWidth" height="3" :y="cellWidth + 4" />
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
                  <g v-for="(attr, i) in logical.attributes.slice(0, 1).concat(logical.attributes.slice(2))" :key="`hgroup${i}`" class="horizontalTextGroup" :transform="`translate(0, ${paddingTop + i * numAttrValues * cellWidth})`">
                    <text v-for="(val, j) in attr.values" :key="`htext${val}`" ref="horizontalLabels" x="0" :y="j * cellWidth + cellWidth / 2 + 2">{{ val }}</text>
                  </g>
                  <g v-for="(attr, i) in logical.attributes.slice(1)" :key="`vgroup${i}`" class="verticalTextGroup" :transform="`translate(${paddingLeft + i * numAttrValues * cellWidth}, 0)`">
                    <text v-for="(val, j) in attr.values" :key="`vtext${val}`" ref="verticalLabels" y="0" :x="j * cellWidth + cellWidth / 2 + 2">{{ val }}</text>
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
          <div class="responsive-table">
            <table id="solTable" class="dataTable sortable">
              <thead>
                <tr>
                  <th v-for="attr in logical.attributes" :key="attr.name" scope="col" class="tableH">{{ attr.name }}</th>
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
        <div id="checkSolutionBox">
          <button id="checkButton" class="loes" @click="checkSolution">Überprüfen</button>
          <img v-if="solved" class="checking" src="@/assets/haken.png" width="40" height="40" />
        </div>
        <h4 id="solved">{{ solveLabel }}</h4>
        <h2>Rätsel bewerten</h2>
        <b-rate v-if="loggedIn" v-model="rating" icon-pack="mdi" icon="star" :max="rateMax" :show-text="false" :rtl="false" :spaced="false" :disabled="false"></b-rate>
        <p v-if="!loggedIn">Um das Rätsel zu bewerten, müssen Sie sich einloggen.</p>
        <div v-if="!solved && alreadySolved">Glückwunsch! Sie haben dieses Rätsel bereits gelöst.</div>
      </div>
    </div>
    <CommentSystem :riddleType="'logical'" :riddleId="computedId" />
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
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

    const horizontalLabels = ref([]);
    const verticalLabels = ref([]);

    const revertHistory = ref([]);
    const revertIndex = ref(0);
    const attrInputs = ref({});
    const solved = ref(false);
    const gridState = ref([]);
    const gridStateCopy = ref([]);
    const cellWidth = ref(25);
    const paddingLeft = ref(50);
    const paddingTop = ref(50);
    const tableVisible = ref(true);
    const selectedColor = ref(0);
    const colors = ref(["#fff", "#333", "#fff"]);
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
      setPadding();
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
      gridState.value = new Array((numAttributes.value * (numAttributes.value + 1)) / 2 * numAttrValues.value * numAttrValues.value).fill(2);
      if (horizontalLabels.value && verticalLabels.value) {
        let maxLabelWidth = 0;
        for (let label of horizontalLabels.value) {
          maxLabelWidth = Math.max(maxLabelWidth, label.getBBox().width);
        }
        let maxLabelHeight = 0;
        for (let label of verticalLabels.value) {
          maxLabelHeight = Math.max(maxLabelHeight, label.getBBox().height);
        }
        paddingLeft.value = maxLabelWidth + 10;
        paddingTop.value = maxLabelHeight + 10;
      }
    };

    const revertState = () => {
      if (revertIndex.value > 0) {
        const state = revertHistory.value[revertIndex.value - 1];
        for (let b = state['x0']; b <= state['x1']; b++) {
          for (let a = state['y0']; a <= state['y1']; a++) {
            const [i, j, k] = toIJK(b, a);
            const cellIndex = cellIndex(i, j, k);
            gridState.value[cellIndex] = state['colorsBefore'][b - state['x0']][a - state['y0']];
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
            const [i, j, k] = toIJK(b, a);
            const cellIndex = cellIndex(i, j, k);
            gridState.value[cellIndex] = state['colorAfter'];
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
      const [x, y] = toXY(i, j, k);
      gridStateCopy.value = [...gridState.value];
      startMouseDown.value = [x, y];
      lastMouseOver.value = startMouseDown.value;
      isMouseDown.value = true;
      gridState.value[cellIndex(i, j, k)] = selectedColor.value;
    };

    const mouseEnter = (i, j, k) => {
      if (isMouseDown.value) {
        const [i1, j1] = toXY(i, j, k);
        const [i2, j2] = startMouseDown.value;
        const [i3, j3] = lastMouseOver.value;
        if (i1 !== i3) {
          for (let x = Math.min(i1, i3); x <= Math.max(i1, i3); x++) {
            for (let y = Math.min(j2, j3); y <= Math.max(j2, j3); y += 1) {
              const [i, j, k] = toIJK(x, y);
              if (i != -1) {
                const cellIndex = cellIndex(i, j, k);
                gridState.value[cellIndex] = gridStateCopy.value[cellIndex];
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
                gridState.value[cellIndex] = gridStateCopy.value[cellIndex];
              }
            }
          }
        }
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a += 1) {
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b += 1) {
            const [i, j, k] = toIJK(a, b);
            if (i != -1) {
              const cellIndex = cellIndex(i, j, k);
              gridState.value[cellIndex] = selectedColor.value;
            }
          }
        }
        lastMouseOver.value = [i1, j1];
      }
    };

    const mainGridMouseUp = () => {
      if (isMouseDown.value) {
        isMouseDown.value = false;
        const [i1, j1] = startMouseDown.value;
        const [i2, j2] = lastMouseOver.value;
        const stateBefore = [];
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          const stateBeforeRow = [];
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            const [i, j, k] = toIJK(a, b);
            if (i != -1) {
              const cellIndex = cellIndex(i, j, k);
              stateBeforeRow.push(gridStateCopy.value[cellIndex]);
              gridState.value[cellIndex] = selectedColor.value;
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
          revertHistory.value[revertIndex.value] = revertObj;
          revertHistory.value.length = revertIndex.value + 1;
        } else {
          revertHistory.value.push(revertObj);
        }
        revertIndex.value += 1;
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
    };
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
  width: 1000px;
  height: 200px;
  object-fit: cover;
}

.puzzleContainer {
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
  background: #f5f5f5;
  box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 2px 0px;
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

tbody {
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