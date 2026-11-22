<template>
  <div class="admin-review">
    <h1 class="page-title">{{ t('review.title') }}</h1>

    <p v-if="!isAdmin" class="muted">{{ t('review.adminOnly') }}</p>
    <template v-else>
      <p class="muted intro">{{ t('review.intro') }}</p>
      <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
      <p v-else-if="error" class="error-text">{{ error }}</p>
      <p v-else-if="!queue.length" class="empty">{{ t('review.empty') }}</p>

      <ul v-else class="queue">
        <li v-for="item in queue" :id="`review-${item.id}`" :key="item.id" class="review-card">
          <div class="review-head">
            <div class="review-title">
              <router-link :to="`/puzzle/${item.id}`" class="item-name">{{ puzzleName(item) }}</router-link>
              <span class="item-meta">
                {{ typeLabel(item.type) }}<template v-if="item.width"> · {{ item.width }}×{{ item.height }}</template>
                · {{ t('review.by', { name: item.creator ? item.creator.username : t('review.unknownCreator') }) }}
                · {{ t('review.submittedAt', { date: formatDate(item.updatedAt) }) }}
              </span>
              <span v-if="item.reviewNote" class="previous-note">{{ t('review.previousNote') }} „{{ item.reviewNote }}“</span>
            </div>
            <router-link :to="`/puzzle/${item.id}`" class="button is-small">
              <ion-icon name="eye-outline" aria-hidden="true"></ion-icon>
              <span>{{ t('review.open') }}</span>
            </router-link>
          </div>

          <div class="review-actions">
            <textarea
              v-model="notes[item.id]"
              class="note"
              rows="2"
              maxlength="2000"
              :aria-label="t('review.notePlaceholder')"
              :placeholder="t('review.notePlaceholder')"
            ></textarea>
            <div class="buttons">
              <button class="button is-success" type="button" :disabled="busy === item.id" @click="decide(item, 'approve')">
                {{ t('review.approve') }}
              </button>
              <button
                class="button is-danger is-outlined"
                type="button"
                :disabled="busy === item.id || !(notes[item.id] || '').trim()"
                @click="decide(item, 'reject')"
              >
                {{ t('review.reject') }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup>
// Admin review queue: puzzles submitted by creators wait here (status
// 'pending') until an Admin publishes them or sends them back with a note.

import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOruga } from '@oruga-ui/oruga-next'
import { useMainStore } from '@/store/store'
import { apiErrorMessage } from '@/i18n'
import PuzzleService from '@/services/PuzzleService'
import { usePuzzleName } from '@/puzzles/puzzleName'

const { t, locale } = useI18n()
const store = useMainStore()
const oruga = useOruga()
const puzzleName = usePuzzleName()

const isAdmin = computed(() => store.user?.role === 'Admin')
const queue = ref([])
const notes = reactive({})
const loading = ref(false)
const error = ref('')
const busy = ref(null)

const typeLabel = type => t(`creator.type.${type}`)
const formatDate = value => (value ? new Date(value).toLocaleDateString(locale.value) : '')
const notify = (message, variant = 'success') =>
  oruga.notification.open({ message, duration: 3000, variant, position: 'top-right' })

async function load () {
  if (!isAdmin.value) return
  loading.value = true
  error.value = ''
  try {
    queue.value = (await PuzzleService.reviewQueue()).data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function decide (item, decision) {
  busy.value = item.id
  try {
    await PuzzleService.review(item.id, decision, (notes[item.id] || '').trim())
    queue.value = queue.value.filter(p => p.id !== item.id)
    notify(t(decision === 'approve' ? 'review.approved' : 'review.rejected', { name: puzzleName(item) }))
  } catch (err) {
    notify(apiErrorMessage(err), 'danger')
  } finally {
    busy.value = null
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.admin-review {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.page-title { font-size: 1.6rem; margin-bottom: 8px; }
.intro { margin-bottom: 16px; }

.queue {
  list-style: none;
  margin: 0;
  padding: 0;
}

.review-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 16px 20px;
  margin-bottom: 14px;
}

.review-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px 16px;

  .button { display: inline-flex; align-items: center; gap: 4px; }
}

.review-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-name { font-weight: 600; font-size: 1.05rem; overflow-wrap: anywhere; }
.item-meta { color: #6b7280; font-size: 0.875rem; }
.previous-note { color: #92400e; font-size: 0.875rem; }

.review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;

  .note {
    flex: 1 1 280px;
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font: inherit;
    resize: vertical;
  }

  .buttons {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
}

.empty { color: #166534; }
.muted { color: #6b7280; }
.error-text { color: #b91c1c; }

@media (max-width: 768px) {
  .admin-review { padding: 8px 0; }
  .review-card { padding: 12px; }
}
</style>
