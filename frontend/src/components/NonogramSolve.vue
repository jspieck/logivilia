<template>
<div>
  <div class="puzzleContainer">
    <div id="puzzleHeader">
      <h1>{{name}}</h1>
    </div>
    <div id="puzzle" class="puzzleBody">
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
      imgName: 'biene.jpg',
      description: 'This is a description',
      logicalQuestion: 'Who did what?',
      clues: [
        'Clue 1',
        'Clue 2',
      ],
      attributes: [
        {
          name: 'Color',
          values: ['Red', 'Green', 'Blue'],
        },
        {
          name: 'Age',
          values: ['10', '13', '15'],
        },
        {
          name: 'Points',
          values: ['1', '2', '3'],
        },
      ],
      attrInputs: {
        '0_0': '',
        '0_1': '',
        '1_0': '',
        '1_1': '',
        '2_0': '',
        '2_1': '',
      },
      solution: [
        ['Red', '13', '1'],
        ['Green', '10', '3'],
        ['Blue', '15', '2'],
      ],
      gridState: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      cellWidth: 25,
      tableVisible: true,
      selectedColor: 0,
      colors: ["#fff", "#333", "#fff"],
    };
  },
  computed: {
    numCells() {
      return this.attributes[0].values.length;
    },
    numBlocks() {
      return this.attributes.length;
    },
    blockWidth() {
      return this.numCells * this.cellWidth;
    },
    paddingLeft() {
      return 50;
    },
    paddingTop() {
      return 50;
    },
    svgWidth() {
      const margin = 20;
      return this.paddingLeft + margin + (this.numBlocks - 1) * this.blockWidth;
    },
    svgHeight() {
      const margin = 20;
      return this.paddingTop + margin + (this.numBlocks - 1) * this.blockWidth;
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
      let pathStr = `M0 0H${this.blockWidth * (this.numBlocks - 1)}`;
      for(let i = 0; i < this.numBlocks - 1; i++){
          pathStr += `M0 ${this.blockWidth * (i + 1)}H${this.blockWidth * (this.numBlocks - 1 - i)}`;
      }
      // draw vertical lines
      pathStr += `M0 0V${this.blockWidth * (this.numBlocks - 1)}`;
      for(let i = 0; i < this.numBlocks - 1; i++){
          pathStr += `M${this.blockWidth * (i + 1)} 0V${this.blockWidth * (this.numBlocks - 1 - i)}`;
      }
      return pathStr;
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
    /*drawHtmlGrid(numCells, numAttributes) {
        let textWidthMax = 0;
        const textHorizontal = [];
        svg.appendChild(horizontalTextGroup);
        const textWidths = [];
        for(let i = 0; i < textHorizontal.length; i++){
          const bbox = textHorizontal[i].getBBox();
          textWidths.push(bbox.width);
          textWidthMax = Math.max(textWidthMax, bbox.width);
        }
        paddingLeft = textWidthMax + 10;
        // now align text right
        for(let i = 0; i < textHorizontal.length; i++){
          textHorizontal[i].setAttribute('x', textWidthMax - textWidths[i]);
        }
        const textHeights = [];
        let textHeightMax = 0;
        for(let i = 0; i < textHorizontal.length; i++){
            const bbox = textVertical[i].getBBox();
            textHeights.push(bbox.height);
            textHeightMax = Math.max(textHeightMax, bbox.height);
        }
        paddingTop = textHeightMax + 10;
        // now align text bottom
        for(let i = 0; i < textVertical.length; i++){
          textVertical[i].setAttribute('y', textHeightMax - textHeights[i]);
        }
        horizontalTextGroup.setAttribute('transform', 'translate(0,'+(paddingTop)+')');
        for(let i = 0; i < numAttributes - 1; i++){
            for(let j = 0; j < numAttributes - 1 - i; j++){
                const rectGroup = createBlockGroup(i, j, numCells);
                rectGroup.setAttribute('transform', `translate(${paddingLeft + blockWidth * i},${paddingTop + blockWidth * j})`);
                svg.appendChild(rectGroup);
            }
        }
        svg.appendChild(drawBlockOutline(numAttributes - 1, numCells, paddingLeft, paddingTop));
        svg.style.height = (paddingTop + (numAttributes - 1) * blockWidth + 20) + 'px';
        container.style.display = 'none';
    },*/
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
