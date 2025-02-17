<template>
  <div class="puzzle-container">
    <div>
      <LogicalDisplay
        ref="logicalDisplay"
        :logical="logical"
        :is-preview="false"
        :solved="solved"
        @solution-check="handleSolutionCheck"
        @solution-update="handleSolutionUpdate"
      />
      <!-- Check Solution Button -->
      <div class="check-solution">
        <button class="check-button" @click="logicalDisplay.checkSolution()">Überprüfen</button>
        <img v-if="solved" class="success-icon" src="@/assets/haken.png" width="40" height="40" />
        <h4 class="solution-message">{{ solveLabel }}</h4>
      </div>
    </div>

    <!-- Rating Section -->
    <div v-if="!store.isUserLoggedIn" class="rating-message">
      Bitte loggen Sie sich ein, um das Rätsel zu bewerten.
    </div>
    <div v-else class="rating-section">
      <h3>Bewertung</h3>
      <b-rate v-model="rating" :max="rateMax" />
    </div>

    <!-- Add solved status message -->
    <div v-if="solved" class="status-section">
      <div v-if="alreadySolved" class="already-solved">
        Sie haben dieses Rätsel bereits gelöst.
      </div>
      <div v-else class="success-message">
        <ion-icon name="checkmark-circle-outline"></ion-icon>
        {{ solveLabel }}
      </div>
    </div>

    <!-- Comments -->
    <CommentSystem :riddleType="'logical'" :riddleId="computedId" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from "@/store/store";
import UserService from '@/services/UserService';
import LogicalService from '@/services/LogicalService';
import LogicalRatingService from '@/services/LogicalRatingService';
import CommentSystem from '@/components/CommentSystem.vue';
import { useOruga } from '@oruga-ui/oruga-next';
import LogicalDisplay from './LogicalDisplay.vue';

const route = useRoute();
const store = useMainStore();
const oruga = useOruga();

const solved = ref(false);
const tableVisible = ref(true);
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

const computedId = computed(() => route.params.id);
const loggedIn = computed(() => store.isUserLoggedIn);

const logicalDisplay = ref(null);

const fetchLogical = async (id) => {
  try {
    const response = await LogicalService.show(id);
    logical.value = response.data;

    // Check user-specific data only if logged in
    if (store.isUserLoggedIn && store.user) {
      await setRating(id);
      await checkIfAlreadySolved();
    }
  } catch (error) {
    console.error('Error loading logical:', error);
  }
};

const setRating = async (logicalId) => {
  if (store.user) {
    const res = await LogicalRatingService.show(logicalId);
    rating.value = res.data.rating;
  }
};

const checkIfAlreadySolved = async () => {
  try {
    console.log('Checking if already solved...');
    if (!store.user || !store.user.id) {
      console.log('No user data available');
      return;
    }

    const response = await UserService.show(store.user.id);
    console.log('User data response:', response.data);

    if (response && response.data) {
      const userData = response.data;
      const logicalId = parseInt(route.params.id, 10);

      if (Array.isArray(userData.solvedLogicals)) {
        alreadySolved.value = userData.solvedLogicals.includes(logicalId);
        console.log('Puzzle solved status:', alreadySolved.value);
      } else {
        console.log('No solvedLogicals array found');
        alreadySolved.value = false;
      }
    } else {
      console.log('No response data');
      alreadySolved.value = false;
    }
  } catch (error) {
    console.error('Error checking solved status:', error);
    alreadySolved.value = false;
  }
};

const handleSolutionCheck = async (isCorrect) => {
  try {
    if (isCorrect) {
      solved.value = true;
      solveLabel.value = "Gratulation, das Rätsel ist gelöst!";
      
      // Only save if user is logged in and puzzle wasn't already solved
      if (store.isUserLoggedIn && !alreadySolved.value) {
        await saveSolvedState();
      }
    } else {
      solved.value = false;
      solveLabel.value = "Es existieren noch Fehler!";
    }
  } catch (error) {
    console.error('Error handling solution:', error);
    oruga.notification.open({
      message: 'Fehler beim Überprüfen der Lösung',
      duration: 3000,
      variant: 'danger'
    });
  }
};

const saveSolvedState = async () => {
  try {
    if (!store.isUserLoggedIn || alreadySolved.value) return;

    const userId = store.user.id;
    const logicalId = parseInt(route.params.id, 10);
    await UserService.logicalSolved(userId, logicalId);
    
    alreadySolved.value = true;
    oruga.notification.open({
      message: 'Rätsel erfolgreich als gelöst markiert!',
      duration: 3000,
      variant: 'success'
    });
  } catch (error) {
    console.error('Error saving solved state:', error);
    oruga.notification.open({
      message: 'Fehler beim Speichern des Lösungsstatus',
      duration: 3000,
      variant: 'danger'
    });
  }
};

const handleSolutionUpdate = (currentState) => {
  // Handle ongoing solution updates if needed
  console.log('Solution updated:', currentState);
};

onMounted(() => {
  fetchLogical(route.params.id);
  tableVisible.value = true;
  window.ondragstart = () => false;
  window.onbeforeunload = () => "Möchten Sie die Seite wirklich verlassen. Nicht gespeicherte Rätsel sind für immer verloren!";
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
  if (newRating != null && store.isUserLoggedIn) {
    try {
      await LogicalRatingService.post({
        LogicalId: parseInt(route.params.id, 10),
        rating: newRating,
      });
      oruga.notification.open({
        message: 'Bewertung gespeichert',
        duration: 3000,
        variant: 'success'
      });
    } catch (error) {
      console.error('Error updating rating:', error);
      oruga.notification.open({
        message: 'Fehler beim Speichern der Bewertung',
        duration: 3000,
        variant: 'danger'
      });
    }
  }
});
</script>

<style lang="scss" scoped>
.puzzle-container {
  max-width: 1200px;
  margin: 0 auto;
}

.puzzle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .puzzle-title {
    font-size: 24px;
    margin: 0;
  }

  .difficulty {
    font-size: 18px;
  }
}

.puzzle-body {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.puzzle-intro {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;

  .header-image {
    border-radius: 8px;
    object-fit: cover;
  }

  .description-section {
    flex: 1;

    h3 {
      margin-top: 0;
    }

    .question {
      margin-top: 15px;
      font-size: 1.1em;
    }
  }
}

.clues-section,
.attributes-section {
  margin-bottom: 30px;

  h3 {
    margin-bottom: 15px;
  }
}

.clues-section {
  background-color: #f3f3f3;
  padding: 15px;
}

.clues-list {
  padding-left: 20px;

  .clue {
    margin-bottom: 8px;
  }
}

.attributes-list {
  list-style: none;
  padding: 0;

  .attribute-row {
    margin-bottom: 8px;
  }
}

.solution-section {
  .toggle-container {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  .color-controls {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
  }
}

.control-buttons {
  display: flex;
  gap: 10px;
}

.control-button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  &:hover {
    background: #e9ecef;
  }

  ion-icon {
    font-size: 20px;
  }

  &.rotate ion-icon {
    transform: scaleX(-1);
  }
}

.grid-container {
  margin: 20px 0;
  overflow: visible;
}

.solution-table {
  margin-top: 20px;
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 10px;
      border: 1px solid #ddd;
    }

    th {
      background: #f5f5f5;
    }
  }
}

.check-solution {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 20px;

  .check-button {
    padding: 10px 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.2s;

    &:hover {
      background: #45a049;
    }
  }

  .success-icon {
    margin: 0 10px;
  }

  .solution-message {
    margin: 0;
    font-size: 16px;
  }
}

.rating-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;

  h2 {
    margin-bottom: 15px;
  }

  .login-message {
    color: #666;
  }

  .already-solved {
    margin-top: 10px;
    color: #666;
    font-style: italic;
  }
}

@media (max-width: 768px) {
  .puzzle-container {
    padding: 10px;
  }

  .puzzle-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .puzzle-intro {
    flex-direction: column;
  }

  .header-image {
    width: 100%;
    height: auto;
  }
}

.horizontal-text-group {
  .horizontal-label {
    text-anchor: end;
    dominant-baseline: middle;
    font-size: 12px;
    fill: #333;
    white-space: nowrap;
  }
}

.vertical-text-group {
  .vertical-label {
    text-anchor: end;
    dominant-baseline: central;
    font-size: 12px;
    fill: #333;
    white-space: nowrap;
  }
}

.solution-grid {
  position: relative;
  margin: 20px 0;

  svg {
    overflow: visible;
  }
}

.status-section {
  margin: 20px 0;

  .success-message {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #2e7d32;
  }

  .already-solved {
    color: #666;
    font-style: italic;
  }
}

.rating-message {
  margin: 1rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  color: #666;
  text-align: center;
}

.rating-section {
  margin: 1rem 0;

  h3 {
    margin-bottom: 0.5rem;
    color: #2c3e50;
  }
}
</style>