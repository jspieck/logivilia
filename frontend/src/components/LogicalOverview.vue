<template>
  <PuzzleOverview type="logical" :title="t('overview.logicalTitle')" />
</template>

<script setup>
// Keeps its own component name so App.vue's <keep-alive> caches it.
import { useI18n } from 'vue-i18n'
import PuzzleOverview from './PuzzleOverview.vue'

const { t } = useI18n()
</script>
