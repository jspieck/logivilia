<template>
<div class="homeScreen">
  <!-- Hero: what Logivilia is, plus the puzzle of the day -->
  <section class="hero">
    <div class="hero-text">
      <p class="kicker">Kostenlose Logikrätsel, jeden Tag ein neues</p>
      <h1 class="hero-title">
        Zeit für Ihre <span class="highlight">geistige Fitness</span>
      </h1>
      <p class="hero-subtitle">
        <template v-if="totalCount >= 100">Über {{ roundedTotal }} Nonogramme, Linelogs und Logikrätsel</template>
        <template v-else>Nonogramme, Linelogs und Logikrätsel</template>
        – direkt im Browser, ohne Anmeldung.
      </p>
      <div class="hero-buttons">
        <router-link v-if="daily" :to="`/puzzle/${daily.id}`" class="cta-button">
          <ion-icon name="calendar-outline"></ion-icon>
          Rätsel des Tages lösen
        </router-link>
        <router-link v-else to="/nonogram-overview" class="cta-button">
          <ion-icon name="play-outline"></ion-icon>
          Jetzt rätseln
        </router-link>
        <router-link v-if="recent" :to="`/puzzle/${recent.id}`" class="secondary-button">
          Weiterspielen: {{ recent.name }}
          <ion-icon name="arrow-forward-outline"></ion-icon>
        </router-link>
      </div>
    </div>

    <router-link v-if="daily" :to="`/puzzle/${daily.id}`" class="daily-card">
      <div class="daily-head">
        <span><ion-icon name="calendar-outline"></ion-icon> Rätsel des Tages</span>
        <span>{{ typeLabel(daily.type) }}<template v-if="daily.width"> · {{ daily.width }}×{{ daily.height }}</template></span>
      </div>
      <div class="daily-name">{{ daily.name }}</div>

      <div v-if="daily.type !== 'logical'" class="daily-grid" :style="gridStyle(daily)">
        <span v-for="n in gridCells(daily)" :key="n"></span>
      </div>
      <div v-else class="daily-logical">
        <img v-if="daily.image" :src="daily.image" alt="" loading="lazy" />
        <p v-if="daily.question">{{ daily.question }}</p>
      </div>

      <div class="daily-foot">
        <span>{{ difficultyLabel(daily.difficulty) }}</span>
        <span v-if="daily.solvedLast24h">{{ daily.solvedLast24h }}× gelöst in den letzten 24 Std.</span>
      </div>
    </router-link>
  </section>

  <!-- The three puzzle types -->
  <section class="puzzle-types">
    <router-link v-for="type in types" :key="type.key" :to="type.overview" class="type-card">
      <div class="type-head">
        <div class="type-icon"><ion-icon :name="type.icon"></ion-icon></div>
        <div>
          <h2>{{ type.title }}</h2>
          <p>{{ type.tagline }}</p>
        </div>
      </div>
      <img v-if="type.image" class="type-image" :src="type.image" :alt="`${type.title} Beispiel`" loading="lazy" />
      <div v-else class="type-sample">
        <strong>Welcher Zwergpudel besitzt welche Fellfarbe?</strong>
        <span>1. Der Zwergpudel namens Bello hat kein rotes Fell.</span>
        <span>2. Der blaue Pudel hat einen längeren Namen als der gelbe.</span>
      </div>
      <div class="type-foot">
        <span>{{ counts[type.key] != null ? `${counts[type.key]} Rätsel` : '' }}</span>
        <span v-if="solved">{{ solved[type.key] || 0 }} gelöst</span>
        <span class="type-link">Ansehen <ion-icon name="arrow-forward-outline"></ion-icon></span>
      </div>
    </router-link>
  </section>

  <!-- Popular puzzles and the leaderboard -->
  <section v-if="popular.length || topPlayers.length" class="bottom-row">
    <div v-if="popular.length" class="panel">
      <h3>Beliebte Rätsel</h3>
      <router-link v-for="p in popular" :key="p.id" :to="`/puzzle/${p.id}`" class="list-row">
        <span>{{ p.name }} <span class="muted">· {{ typeLabel(p.type) }}</span></span>
        <span class="muted">{{ difficultyLabel(p.difficulty) }}</span>
      </router-link>
    </div>
    <div v-if="topPlayers.length" class="panel">
      <h3>Bestenliste</h3>
      <router-link v-for="(player, i) in topPlayers" :key="player.id" :to="`/user/${player.id}`" class="list-row">
        <span>{{ i + 1 }}. {{ player.username }}</span>
        <span class="muted">{{ player.solvedCount }} gelöst</span>
      </router-link>
      <router-link to="/leaderboard" class="panel-link">Ganze Bestenliste <ion-icon name="arrow-forward-outline"></ion-icon></router-link>
    </div>
  </section>
</div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store/store'
import PuzzleService from '@/services/PuzzleService'
import UserService from '@/services/UserService'
import { recentPuzzle } from '@/puzzles/recentPuzzle'
import nonoExample from '@/assets/nonoExample.png'
import linelogExample from '@/assets/linelogExample.png'

const TYPE_LABELS = { nonogram: 'Nonogramm', linelog: 'Linelog', logical: 'Logikrätsel' }
// Bigger puzzles are drawn at most this many cells wide in the daily card.
const MAX_PREVIEW_CELLS = 15

const types = [
  { key: 'nonogram', title: 'Nonogramme', tagline: 'Bilder aus Zahlen aufdecken', icon: 'apps-outline', overview: '/nonogram-overview', image: nonoExample },
  { key: 'linelog', title: 'Linelogs', tagline: 'Gleiche Zahlen verbinden', icon: 'git-network-outline', overview: '/linelog-overview', image: linelogExample },
  { key: 'logical', title: 'Logikrätsel', tagline: 'Hinweise kombinieren', icon: 'grid-outline', overview: '/logical-overview', image: null }
]

const store = useMainStore()
const { isUserLoggedIn, user } = storeToRefs(store)

const counts = ref({})
const daily = ref(null)
const popular = ref([])
const topPlayers = ref([])
const solved = ref(null)
const recent = ref(recentPuzzle())

const totalCount = computed(() => Object.values(counts.value).reduce((a, b) => a + b, 0))
// "Über 300" reads better than "Über 337".
const roundedTotal = computed(() => Math.floor(totalCount.value / 50) * 50)

const typeLabel = type => TYPE_LABELS[type] || type
const difficultyLabel = d => d == null ? '' : d <= 2 ? 'leicht' : d === 3 ? 'mittel' : 'schwer'

const previewSize = p => {
  const scale = Math.min(1, MAX_PREVIEW_CELLS / Math.max(p.width || 1, p.height || 1))
  return { cols: Math.max(1, Math.round((p.width || 10) * scale)), rows: Math.max(1, Math.round((p.height || 10) * scale)) }
}
const gridCells = p => { const { cols, rows } = previewSize(p); return cols * rows }
// Cells at most 18px, so small puzzles don't turn into big blocks.
const gridStyle = p => {
  const { cols } = previewSize(p)
  return { gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: `${Math.min(220, cols * 18)}px` }
}

async function loadHome () {
  try {
    const { data } = await PuzzleService.home()
    counts.value = data.counts || {}
    daily.value = data.daily
    popular.value = data.popular || []
    topPlayers.value = data.topPlayers || []
  } catch (error) {
    // The page still works without it: static cards, plain call to action.
    console.error('Error loading start page data:', error)
  }
}

async function loadSolved () {
  if (!isUserLoggedIn.value || !user.value) {
    solved.value = null
    return
  }
  try {
    solved.value = (await UserService.show(user.value.id)).data.stats?.solved || null
  } catch {
    solved.value = null
  }
}

onMounted(() => {
  loadHome()
  loadSolved()
})
watch(isUserLoggedIn, loadSolved)
</script>

<style lang="scss" scoped>
$accent: #7957d5;
$accent-dark: #5f3fbf;
$text: #1a1a1a;
$muted: #6b6b6b;
$border: rgba(0, 0, 0, 0.08);

.homeScreen {
  width: 100%;
  padding: 32px 24px 48px;
  color: $text;
}

a {
  color: inherit;
  text-decoration: none;
}

.muted {
  color: $muted;
}

// Hero
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 32px;
  align-items: center;
  margin-bottom: 40px;
}

.kicker {
  color: $accent;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.hero-title {
  font-size: 2.6rem;
  line-height: 1.15;
  margin-bottom: 1rem;
  color: $text;

  .highlight {
    color: $accent;
    font-weight: 700;
  }
}

.hero-subtitle {
  font-size: 1.15rem;
  color: $muted;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.hero-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.cta-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  transition: background-color 0.2s, border-color 0.2s;

  ion-icon {
    font-size: 18px;
  }
}

.cta-button {
  background: $accent;
  color: #fff;

  &:hover {
    background: $accent-dark;
    color: #fff;
  }
}

.secondary-button {
  border: 1px solid #d6d6d6;
  background: #fff;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    border-color: $accent;
    color: $accent;
  }
}

// Puzzle of the day
.daily-card {
  display: block;
  background: #fff;
  border: 1px solid $border;
  border-radius: 16px;
  padding: 16px 18px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: $accent;
    box-shadow: 0 6px 20px rgba(121, 87, 213, 0.12);
  }
}

.daily-head,
.daily-foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.8rem;
  color: $muted;

  ion-icon {
    vertical-align: -2px;
  }
}

.daily-name {
  font-weight: 600;
  font-size: 1.1rem;
  margin: 4px 0 12px;
}

.daily-grid {
  display: grid;
  gap: 2px;
  max-width: 220px;
  margin: 0 auto 12px;

  span {
    aspect-ratio: 1;
    border-radius: 2px;
    background: #f1effb;
    border: 1px solid #e2ddf5;
  }
}

.daily-logical {
  margin-bottom: 12px;

  img {
    width: 100%;
    max-height: 150px;
    object-fit: cover;
    border-radius: 10px;
    margin-bottom: 8px;
  }

  p {
    font-size: 0.9rem;
    color: $muted;
    line-height: 1.4;
  }
}

// Puzzle types
.puzzle-types {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.type-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid $border;
  border-radius: 16px;
  padding: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: $accent;
    box-shadow: 0 6px 20px rgba(121, 87, 213, 0.12);

    .type-link {
      color: $accent;
    }
  }
}

.type-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;

  h2 {
    font-size: 1.15rem;
    margin: 0;
    color: $text;
  }

  p {
    margin: 0;
    font-size: 0.85rem;
    color: $muted;
  }
}

.type-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f1effb;
  color: $accent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.type-image,
.type-sample {
  height: 150px;
  border-radius: 10px;
  margin-bottom: 12px;
  background: #fafafa;
}

.type-image {
  width: 100%;
  object-fit: contain;
}

.type-sample {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  font-size: 0.8rem;
  line-height: 1.35;
  color: $muted;
  overflow: hidden;

  strong {
    color: $text;
  }
}

.type-foot {
  margin-top: auto;
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 0.85rem;
  color: $muted;
}

.type-link {
  margin-left: auto;
  font-weight: 600;
  color: $text;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

// Popular puzzles and leaderboard
.bottom-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 20px;
}

.panel {
  background: #fafafa;
  border-radius: 16px;
  padding: 16px 18px;

  h3 {
    font-size: 1rem;
    margin-bottom: 8px;
    color: $text;
  }
}

.list-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: 0.95rem;
  border-bottom: 1px solid $border;

  &:last-of-type {
    border-bottom: none;
  }

  &:hover > span:first-child {
    color: $accent;
  }
}

.panel-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 0.85rem;
  color: $accent;
  font-weight: 600;
}

@media (max-width: 900px) {
  .hero,
  .bottom-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .puzzle-types {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-title {
    font-size: 2rem;
  }
}

@media (max-width: 600px) {
  .homeScreen {
    padding: 20px 16px 32px;
  }
}
</style>
