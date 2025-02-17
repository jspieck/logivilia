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
          <MySelect :options="difficulties" v-model="logical.difficulty"/>
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
          <draggable v-model="logical.clues" group="clues" @start="drag=true" @end="drag=false" handle=".handle" item-key="id">
            <template #item="{element, index}">
              <div class="clue">
                <i class="fa fa-align-justify handle"></i>
                <textarea v-model="element.text" class="clueInput"/>
                <i class="fa fa-times close" @click="removeClue(index)"></i>
              </div>
            </template>
          </draggable>
          <button @click="addClue">Neuer Hinweis</button>
        </b-field>
        <p class="error" v-if="!cluesFinished">Bitte mindestens einen Hinweis geben. Jeder Hinweis muss mindestens 10 Zeichen lang sein.</p>
        <b-field label="Lösung" :addons="false">
          <p>Anzahl an Attributwerten:</p>
          <!--<input type="number" @input="setAttributeValNumber"/>-->
          <MySelect :options='attrValNumberOptions' v-model="numAttributeValues"/>
          <table class="attributeTable">
            <thead>
              <!-- All the attribute names -->
              <tr>
                <td>Attributname</td>
                <td v-for="[i, attr] in logical.attributes.entries()" v-bind:key="'attrN' + i">
                  <input v-model="attr.name"/>
                </td>
              </tr>
            </thead>
            <tbody>
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
            </tbody>
          </table>
          <o-modal v-model="isModalActive" :destroy-on-hide="true">
            <div class="box">
              <h3 class="title is-4">Attribut löschen</h3>
              <p>Willst du das Attribut wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
              <div class="buttons mt-4">
                <o-button label="Nicht löschen" @click="isModalActive = false" />
                <o-button label="Löschen" variant="danger" @click="confirmDelete" />
              </div>
            </div>
          </o-modal>
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
      <LogicalDisplay :logical="previewLogical" :solved="false" />
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useOruga } from '@oruga-ui/oruga-next';
import Toggle from './Toggle.vue';
import MySelect from './MySelect.vue';
import LogicalService from '@/services/LogicalService';
import draggable from 'vuedraggable';
import LogicalDisplay from './LogicalDisplay.vue';

// Composables
const oruga = useOruga();

// State
const difficulties = ref([1, 2, 3, 4, 5]);
const attrValNumberOptions = ref([2, 3, 4, 5, 6, 7, 8, 9, 10]);
const numAttributeValues = ref(2);
const preview = ref(true);

// For confirmation oruga modal
const isModalActive = ref(false);
const deleteIndex = ref(null);

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
  date: new Date().toISOString().slice(0, 10),
  author: ""
});

const previewLogical = computed(() => {
  return {
    name: logical.value.name,
    difficulty: logical.value.difficulty,
    description: logical.value.description,
    question: logical.value.question,
    clues: logical.value.clues.map(clue => clue.text),
    attributes: logical.value.attributes.map(attr => ({
      name: attr.name,
      values: attr.values.map(v => v.name)
    })),
    image: logical.value.image,
    date: logical.value.date,
    author: logical.value.author,
    solution: solution.value
  }
})

// Computed properties
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
  if (names.size != logical.value.attributes.length) {
    return false;
  }
  return true;
});

const nameFinished = computed(() => logical.value.name !== "");
const descriptionFinished = computed(() => logical.value.description.length > 20);
const questionFinished = computed(() => logical.value.question.length > 20);
const riddleFinished = computed(() => {
  return nameFinished.value && 
         descriptionFinished.value && 
         questionFinished.value && 
         cluesFinished.value && 
         solutionFinished.value;
});

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

// Methods
const removeAttribute = (i) => {
  if (logical.value.attributes.length > 2) {
    deleteIndex.value = i;
    isModalActive.value = true;
  } else {
    oruga.notification.open({
      message: 'Es muss mindestens drei Attribute geben, damit eins gelöscht werden kann!',
      duration: 2000,
      variant: 'warning'
    });
  }
};

const confirmDelete = () => {
  logical.value.attributes.splice(deleteIndex.value, 1);
  isModalActive.value = false;
  oruga.notification.open({
    message: 'Attribut gelöscht!',
    variant: 'success',
    duration: 2000
  });
};

const addAttribute = () => {
  const attrValues = []
  for (let i = 0; i < numAttributeValues.value; i += 1) {
    attrValues.push({name: ""})
  }
  logical.value.attributes.push({
    "name": "",
    "values": attrValues
  })
};

const createLogical = async () => {
  try {
    if (riddleFinished.value) {
      const flattenedAttributes = []
      for (const attr of logical.value.attributes) {
        const flatAttr = {name: attr.name}
        flatAttr.values = attr.values.map(v => v.name)
        flattenedAttributes.push(flatAttr)
      }

      const cluesTextList = []
      for (const clue of logical.value.clues) {
        cluesTextList.push(clue.text)
      }
  
      const logicalData = {
        name: logical.value.name,
        solution: solution.value,
        difficulty: logical.value.difficulty,
        description: logical.value.description,
        question: logical.value.question,
        clues: cluesTextList,
        attributes: flattenedAttributes,
        image: "",
        date: new Date().toISOString().slice(0, 10),
        author: logical.value.author
      }
      
      await LogicalService.post(logicalData)
      oruga.notification.open({
        message: 'Logikrätsel erfolgreich erstellt!',
        duration: 2000,
        variant: 'success'
      })
    } else {
      oruga.notification.open({
        message: 'Das Rätsel ist noch nicht vollständig!',
        duration: 2000,
        variant: 'danger'
      })
    }
  } catch(err) {
    console.error(err)
    oruga.notification.open({
      message: 'Fehler beim Erstellen des Logikrätsels',
      duration: 2000,
      variant: 'danger'
    })
  }
};

watch(numAttributeValues, (newValue) => {
  if (newValue !== '') {
    setAttributeValNumber(parseInt(newValue))
  }
})

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

const removeClue = (idx) => {
  logical.value.clues.splice(idx, 1);
};

const addClue = () => {
  logical.value.clues.push({
    "id": logical.value.clues.length,
    "text": ""
  });
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
