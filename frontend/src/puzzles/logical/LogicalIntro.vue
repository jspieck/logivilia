<script setup>
// Logic puzzle header: title, timer, difficulty, image, story and question.

import { useI18n } from 'vue-i18n'
import DifficultyIndicator from '@/components/DifficultyIndicator.vue'
import { formatTime } from '../engine/progress'

const { t } = useI18n()
defineProps({
  logical: { type: Object, required: true },
  // Seconds played (null: no timer, e.g. preview).
  elapsed: { type: Number, default: null }
})
</script>

<template>
  <div class="puzzle-header">
    <h1 class="puzzle-title">{{ logical.name }}</h1>
    <div class="header-side">
      <span v-if="elapsed !== null" class="timer" :title="t('nonogram.time')">
        <ion-icon name="time-outline"></ion-icon>{{ formatTime(elapsed) }}
      </span>
      <DifficultyIndicator :difficulty="logical.difficulty" :maxDifficulty="5" />
    </div>
  </div>

  <section class="puzzle-intro">
    <img v-if="logical.image" class="header-image" :src="logical.image" :alt="t('logical.headerImage')" />
    <div class="description-section">
      <p class="description">{{ logical.description }}</p>
      <p v-if="logical.question" class="question">{{ logical.question }}</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@import '../engine/board.scss';

.puzzle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;

  .puzzle-title {
    font-size: 26px;
    font-weight: 600;
    margin: 0;
  }

  .header-side {
    display: flex;
    align-items: center;
    gap: 14px;
  }
}

.puzzle-intro {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 24px;

  .header-image {
    width: 280px;
    max-width: 40%;
    border-radius: 10px;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .description-section {
    flex: 1;
    min-width: 0;
  }

  .description {
    margin: 0 0 12px;
    line-height: 1.6;
  }

  .question {
    margin: 0;
    padding: 10px 14px;
    border-left: 4px solid var(--accent, #2563eb);
    background: #eff6ff;
    border-radius: 0 8px 8px 0;
    font-weight: 600;
    color: #1e3a8a;
  }
}

@media (max-width: 768px) {
  .puzzle-header {
    flex-direction: column;
    align-items: flex-start;

    .puzzle-title { font-size: 22px; }
  }

  .puzzle-intro {
    flex-direction: column;

    .header-image {
      width: 100%;
      max-width: 100%;
    }
  }
}
</style>
