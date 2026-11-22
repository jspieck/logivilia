<template>
  <div class="my-puzzles" :class="{ embedded }">
    <div class="my-header">
      <component :is="embedded ? 'h3' : 'h1'" :class="embedded ? 'section-title' : 'page-title'">{{ t('creator.title') }}</component>
      <div class="new-buttons">
        <router-link v-for="type in TYPES" :key="type" :to="createPath(type)" class="button is-small is-primary is-outlined">
          <ion-icon name="add-outline" aria-hidden="true"></ion-icon>
          <span>{{ t(`creator.new.${type}`) }}</span>
        </router-link>
      </div>
    </div>

    <p v-if="!store.isUserLoggedIn" class="muted">{{ t('creator.loginNeeded') }}</p>
    <p v-else-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>

    <template v-else>
      <section class="my-card">
        <h2 class="card-title">{{ t('creator.drafts') }}</h2>
        <p v-if="!drafts.length" class="muted">{{ t('creator.noDrafts') }}</p>
        <ul v-else class="item-list">
          <li v-for="draft in drafts" :key="draft.id" class="item">
            <div class="item-main">
              <router-link :to="draftPath(draft)" class="item-name">{{ draft.name || t('creator.untitled') }}</router-link>
              <span class="item-meta">{{ typeLabel(draft.type) }} · {{ t('creator.savedAt', { date: formatDate(draft.updatedAt) }) }}</span>
            </div>
            <div class="item-actions">
              <router-link :to="draftPath(draft)" class="button is-small is-primary">{{ t('creator.continue') }}</router-link>
              <button class="button is-small is-danger is-outlined" type="button" @click="removeDraft(draft)">
                {{ t('creator.deleteDraft') }}
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section class="my-card">
        <h2 class="card-title">{{ t('creator.puzzles') }}</h2>
        <p v-if="!puzzles.length" class="muted">{{ t('creator.noPuzzles') }}</p>
        <ul v-else class="item-list">
          <li v-for="puzzle in puzzles" :key="puzzle.id" class="item">
            <div class="item-main">
              <span class="item-title">
                <router-link :to="`/puzzle/${puzzle.id}`" class="item-name">{{ puzzleName(puzzle) }}</router-link>
                <span class="status-tag" :class="`is-${puzzle.status}`">{{ t(`creator.status.${puzzle.status}`) }}</span>
              </span>
              <span class="item-meta">{{ typeLabel(puzzle.type) }} · {{ t('creator.changedAt', { date: formatDate(puzzle.updatedAt) }) }}</span>
              <span v-if="puzzle.status === 'rejected' && puzzle.reviewNote" class="review-note">
                {{ t('creator.reviewNote') }} „{{ puzzle.reviewNote }}“
              </span>
            </div>
            <span v-if="puzzle.status === 'published' && !isAdmin" class="item-meta locked-hint">{{ t('creator.lockedHint') }}</span>
            <div v-else class="item-actions">
              <router-link :to="editPath(puzzle)" class="button is-small is-primary is-outlined">
                <ion-icon name="create-outline" aria-hidden="true"></ion-icon>
                <span>{{ t('creator.edit') }}</span>
              </router-link>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
// "Meine Rätsel": the logged-in creator's server drafts and own puzzles with
// their review status, each with a way back into the editor. A page of its
// own (/my-puzzles) and a section of the own profile (embedded).

import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMainStore } from '@/store/store'
import { apiErrorMessage } from '@/i18n'
import PuzzleService from '@/services/PuzzleService'
import { usePuzzleName } from '@/puzzles/puzzleName'
import { createPath, editPath, draftPath } from '@/puzzles/index'

defineProps({ embedded: { type: Boolean, default: false } })

const TYPES = ['nonogram', 'logical', 'linelog']

const { t, locale } = useI18n()
const store = useMainStore()
const puzzleName = usePuzzleName()

const drafts = ref([])
const puzzles = ref([])
const loading = ref(false)
const error = ref('')

// Published puzzles are locked for their author; only Admins edit them.
const isAdmin = computed(() => store.user?.role === 'Admin')
const typeLabel = type => t(`creator.type.${type}`)
const formatDate = value => (value ? new Date(value).toLocaleDateString(locale.value) : '')

async function load () {
  if (!store.isUserLoggedIn) return
  loading.value = true
  error.value = ''
  try {
    const [draftRes, puzzleRes] = await Promise.all([PuzzleService.drafts(), PuzzleService.mine()])
    drafts.value = draftRes.data
    puzzles.value = puzzleRes.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function removeDraft (draft) {
  if (!window.confirm(t('creator.confirmDelete', { name: draft.name || t('creator.untitled') }))) return
  try {
    await PuzzleService.deleteDraft(draft.id)
    drafts.value = drafts.value.filter(d => d.id !== draft.id)
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.my-puzzles {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;

  &.embedded {
    max-width: none;
    padding: 0;
    margin-top: 24px;
  }
}

.my-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .page-title { font-size: 1.6rem; margin: 0; }
  .section-title { margin: 0; }
  .section-title { font-size: 1.25rem; font-weight: 600; }
}

.new-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .button { display: inline-flex; align-items: center; gap: 4px; }
}

.my-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 16px 20px;
  margin-bottom: 16px;

  .card-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 10px;
  }
}

.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.item {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px 16px;
  padding: 10px 0;
  border-top: 1px solid #eee;

  &:first-child { border-top: none; }
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.item-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.item-meta { color: #6b7280; font-size: 0.875rem; }

.review-note { color: #991b1b; font-size: 0.875rem; }
.locked-hint { max-width: 260px; }

.item-actions {
  display: flex;
  gap: 8px;

  .button { display: inline-flex; align-items: center; gap: 4px; }
}

.status-tag {
  display: inline-block;
  padding: 1px 9px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;

  &.is-pending { background: #fef3c7; color: #92400e; }
  &.is-rejected { background: #fee2e2; color: #991b1b; }
  &.is-published { background: #dcfce7; color: #166534; }
}

.muted { color: #6b7280; }
.error-text { color: #b91c1c; }

@media (max-width: 768px) {
  .my-puzzles { padding: 8px 0; }
  .my-card { padding: 12px; }
}
</style>
