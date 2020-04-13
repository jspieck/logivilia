<template>
<div>
  <div class="puzzleContainer">
    <div id="puzzleHeader">
      <h1>{{name}}</h1>
    </div>
    <div id="puzzle" class="puzzleBody">
      <div id="buttonBar">
        <button id="zoomIn" class="nonoButton largerIcon"><ion-icon v-pre name="ios-add"></ion-icon></button>
        <button id="zoomOut" class="nonoButton largerIcon"><ion-icon v-pre name="ios-remove"></ion-icon></button>
        <button id="revert" class="nonoButton"><ion-icon v-pre name="ios-refresh"></ion-icon></button>
        <button id="restore" class="nonoButton"><ion-icon v-pre name="ios-refresh"></ion-icon></button>
        <button id="loadNono" class="nonoButton"><ion-icon v-pre name="ios-folder-open"></ion-icon></button>
        <button id="saveNono" class="nonoButton"><ion-icon v-pre name="ios-save"></ion-icon></button>
      </div>
      <div id="nonoArea">
        <table>
          <tr>
            <td></td>
            <td><div id="verticalInformation" ref="verticalInformation"></div></td>
          </tr>
          <tr>
            <td><div id="horizontalInformation" ref="horizontalInformation"></div></td>
            <td><div id="mainArea" ref="mainArea"></div></td>
          </tr>
        </table>
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


export default {
  name: 'NonogramSolve',
  data() {
    return {
      name: 'Nonogram Test',
      solved: false,
      height: 5,
      width: 5,
      solution: [
        [0,0,1,0,0],
        [0,1,1,1,0],
        [1,1,1,1,1],
        [0,1,0,1,0],
        [0,0,1,0,0]
      ],
      cellWidth: 25,
      tableVisible: true,
      selectedColor: 1,
      colors: ["#ffffff", "#333333", "#ffffff"],
      startMouseDown: [0, 0],
      lastMouseOver: [0, 0],
      gridCells: [],
      isMouseDown: false,
    };
  },
  computed: {
    gridState() {
      return Array(this.width * this.height).fill(0);
    },
    horizontalInfo() {
      const horizontalInfo = [];
      for (let i = 0; i < this.height; i++) {
        const rowInfo = [];
        let currentNumber = this.solution[i][0];
        let currentNumberCounter = 1;
        for (let j = 1; j < this.width; j++) {
          if (this.solution[i][j] != currentNumber) {
            if (currentNumber != 0) {
              rowInfo.push([currentNumber, currentNumberCounter]);
            }
            currentNumber = this.solution[i][j];
            currentNumberCounter = 1;
          } else {
            currentNumberCounter += 1;
          }
        }
        if (currentNumber > 0) {
          rowInfo.push([currentNumber, currentNumberCounter]);
        }
        horizontalInfo.push(rowInfo);
      }
      return horizontalInfo;
    },
   verticalInfo() {
      const verticalInfo = [];
      for (let i = 0; i < this.width; i++) {
        const columnInfo = [];
        let currentNumber = this.solution[0][i];
        let currentNumberCounter = 1;
        for (let j = 1; j < this.height; j++) {
          if (this.solution[j][i] != currentNumber) {
            if (currentNumber != 0) {
              columnInfo.push([currentNumber, currentNumberCounter]);
            }
            currentNumber = this.solution[j][i];
            currentNumberCounter = 1;
          } else {
            currentNumberCounter += 1;
          }
        }
        if (currentNumber > 0) {
          columnInfo.push([currentNumber, currentNumberCounter]);
        }
        verticalInfo.push(columnInfo);
      }
      return verticalInfo;
    },
    maxBlockHorizontal() {
      let longest = 0;
      for (const row of this.horizontalInfo) {
        longest = Math.max(longest, row.length);
      }
      return longest;
    },
    maxBlockVertical() {
      let longest = 0;
      for (const column of this.verticalInfo) {
        longest = Math.max(longest, column.length);
      }
      return longest;
    },
  },
  mounted() {
    this.createHorizontalInformation();
    this.createVerticalInformation();
    this.createMainArea();
  },
  methods: {
    getLighting(color) {
      const colorInfo = color.substring(1);      // strip #
      const rgb = parseInt(colorInfo, 16);   // convert rrggbb to decimal
      const r = (rgb >> 16) & 0xff;  // extract red
      const g = (rgb >>  8) & 0xff;  // extract green
      const b = (rgb >>  0) & 0xff;  // extract blue
      return 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
    },
    createHorizontalInformation() {
      const hoDiv = this.$refs.horizontalInformation;
      hoDiv.innerHTML = "";
      for(let a = 0; a < this.height; a+=5){
        const gridGroupRow = document.createElement("div");
        gridGroupRow.setAttribute("class", "gridRow");
        const gridGroup = document.createElement("div");
        gridGroup.setAttribute("class", "gridGroup");
        for(let i = a; i < Math.min(a + 5, this.height); i++){
          const gridRow = document.createElement("div");
          gridRow.setAttribute("id", "row" + i);
          gridRow.setAttribute("class", "gridRow");
          for(let j = 0; j < this.maxBlockHorizontal; j++){
            const gridCell = document.createElement("div");
            gridCell.setAttribute("id", "cellH" + i + "_" + j);
            gridCell.setAttribute("class", "gridCell noselect");
            gridCell.setAttribute("data-x", j);
            gridCell.setAttribute("data-y", i);
            /*gridCell.addEventListener("mousedown", mouseDownInfoEvent, false);
            gridCell.addEventListener("mouseover", mouseOverInfoEvent, false);
            gridCell.addEventListener("mouseout", mouseOutInfoEvent, false);
            gridCell.addEventListener("mouseup", mouseUpInfoEvent, false);*/
            if(this.horizontalInfo[i][j] != null){
              const [colorNumber, innerBlockLength] = this.horizontalInfo[i][j];
              gridCell.style.color = this.colors[colorNumber];
              if (this.getLighting(this.colors[colorNumber]) > 200) {
                gridCell.style.background = "rgb(60, 60, 60)";
              }
              const cellNumber = document.createTextNode(innerBlockLength);
              gridCell.appendChild(cellNumber);
            }
            gridRow.appendChild(gridCell);
          }
          //add one box for correctly solved
          const correctlySolved = document.createElement("div");
          correctlySolved.setAttribute("id", "rowCorrect" + i);
          correctlySolved.setAttribute("class", "correctRow");
          gridRow.appendChild(correctlySolved);
          gridGroup.appendChild(gridRow);
          gridGroupRow.appendChild(gridGroup);
        }
        hoDiv.appendChild(gridGroupRow);
      }
      /* hoDiv.addEventListener("touchstart", touchDownInfoEvent, false);
      hoDiv.addEventListener("touchmove", touchOverInfoEvent, false);
      hoDiv.addEventListener("touchleave", touchOutInfoEvent, false);
      hoDiv.addEventListener("touchend", touchUpInfoEvent, false); */
    },
    createVerticalInformation() {
      const veDiv = this.$refs.verticalInformation;
      veDiv.innerHTML = "";
      for(let a = 0; a < this.width; a+=5){
        const gridGroupRow = document.createElement("div");
        gridGroupRow.setAttribute("class", "gridRow");
        const gridGroup = document.createElement("div");
        gridGroup.setAttribute("class", "gridGroup");
        for(let i = 0; i < this.maxBlockVertical; i++){
          const gridRow = document.createElement("div");
          gridRow.setAttribute("id", "row" + i);
          gridRow.setAttribute("class", "gridRow");
          for(let j = a; j < Math.min(a + 5, this.width); j++){
            const gridCell = document.createElement("div");
            gridCell.setAttribute("id", "cellV" + i + "_" + j);
            gridCell.setAttribute("class", "gridCell noselect");
            gridCell.setAttribute("data-x", j);
            gridCell.setAttribute("data-y", i);
            /*gridCell.addEventListener("mousedown", mouseDownInfoEvent, false);
            gridCell.addEventListener("mouseover", mouseOverInfoEvent, false);
            gridCell.addEventListener("mouseout", mouseOutInfoEvent, false);
            gridCell.addEventListener("mouseup", mouseUpInfoEvent, false);*/
            if(this.verticalInfo[j][i] != null){
              const [colorNumber, innerBlockLength] = this.verticalInfo[j][i];
              gridCell.style.color = this.colors[colorNumber];
              if (this.getLighting(this.colors[colorNumber]) > 200) {
                gridCell.style.background = "rgb(60, 60, 60)";
              }
              const cellNumber = document.createTextNode(innerBlockLength);
              gridCell.appendChild(cellNumber);
            }
            gridRow.appendChild(gridCell);
          }
          //add one box for correctly solved
          const correctlySolved = document.createElement("div");
          correctlySolved.setAttribute("id", "columnCorrect" + i);
          correctlySolved.setAttribute("class", "correctColumn");
          gridRow.appendChild(correctlySolved);
          gridGroup.appendChild(gridRow);
          gridGroupRow.appendChild(gridGroup);
        }
        veDiv.appendChild(gridGroupRow);
      }
      /* hoDiv.addEventListener("touchstart", touchDownInfoEvent, false);
      hoDiv.addEventListener("touchmove", touchOverInfoEvent, false);
      hoDiv.addEventListener("touchleave", touchOutInfoEvent, false);
      hoDiv.addEventListener("touchend", touchUpInfoEvent, false); */
    },
    cellMouseDown(e, i, j) {
      this.startMouseDown = [i, j];
      this.lastMouseOver = this.startMouseDown;
      this.isMouseDown = true;
      this.gridCells[j * this.width + i].style.background = this.colors[this.selectedColor];
    },
    cellMouseEnter(e, i1, j1) {
      if (this.isMouseDown) {
        const [i2, j2] = this.startMouseDown;
        const [i3, j3] = this.lastMouseOver;
        if (i1 !== i3) {
          for (let a = Math.min(j2, j3); a <= Math.max(j2, j3); a++) {
            const ind = a * this.width + i3;
            console.log(i3, a);
            this.gridCells[ind].style.background = this.colors[this.gridState[ind]];
          }
        }
        if (j1 !== j3) {
          for (let a = Math.min(i2, i3); a <= Math.max(i2, i3); a++) {
            const ind = j3 * this.width + a;
            console.log(a, j3);
            this.gridCells[ind].style.background = this.colors[this.gridState[ind]];
          }
        }
        for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
          for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
            this.gridCells[b * this.width + a].style.background = this.colors[this.selectedColor];
          }
        }
        this.lastMouseOver = [i1, j1];
      }
    },
    mainGridMouseUp() {
      // TODO handle mouse leave
      const [i1, j1] = this.startMouseDown;
      const [i2, j2] = this.lastMouseOver;
      for (let a = Math.min(i1, i2); a <= Math.max(i1, i2); a++) {
        for (let b = Math.min(j1, j2); b <= Math.max(j1, j2); b++) {
          this.gridState[b * this.width + a] = this.selectedColor;
        }
      }
      this.isMouseDown = false;
    },
    createMainArea() {
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
    /*touch events on canvas
    canvasGrid.addEventListener("touchstart", doTouchDownEvent, false);
    canvasGrid.addEventListener("touchmove", doTouchOverEvent, false);
    canvasGrid.addEventListener("touchleave", doTouchOutEvent, false);
    canvasGrid.addEventListener("touchend", doTouchUpEvent, false);

    //Problem if not outside but not over cell
    if(typ == "none" || typ == "create"){
        document.getElementById("alignKapsel").addEventListener("mouseleave", doMouseOutEvent, false);
    }else
        canvasGrid.addEventListener("mouseleave", doMouseOutEvent, false);

    jQuery('body').on('contextmenu', '#gridRid', function(e){ return false; });
    jQuery('body').on('mouseup', function(e){mouseDown = false;});
    zoom();*/
    },
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
    selectColor(i) {
      this.selectedColor = i;
    }
  },
};
</script>

<style lang="scss">
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

.puzzleContainer {
  /* background: white; */
  overflow: hidden;
  border-radius: 10px;
  margin-top: 20px;
  margin-bottom: 20px;
  position: relative;
}

#nonoArea {
  margin: 30px 0;
}

.gridCell {
  display: inline-block;
  vertical-align: top;
  width: 25px;
  height: 25px;
  border-left: 1px solid #A0A0A0;
  border-top: 1px solid #A0A0A0;
  text-align: center;
  line-height: 25px;
  font-size: 18px;
  color: #111111;
}

.gridGroup .gridRow:first-child .gridCell {
  border-top: none;
}

.gridGroup .gridRow .gridCell:first-child {
  border-left: none;
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
  background-color: #f7f7f7;
  background-image: -webkit-gradient(linear, left top, left bottom, from(#f7f7f7), to(#e7e7e7));
  color: black;
  padding: 2px;
  width: 35px;
  height: 35px;
  line-height: 35px;
  position: relative;
  text-align: center;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  
  vertical-align: top;
  margin-right: 20px;
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
</style>
