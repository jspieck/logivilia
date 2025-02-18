<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import UserService from '@/services/UserService'

const router = useRouter()

const rankings = ref({
  logicals: [],
  nonograms: [],
  linelogs: []
})

const loading = ref(true)

onMounted(async () => {
  try {
    const response = await UserService.getRankings()
    rankings.value = response.data
    loading.value = false
  } catch (error) {
    console.error('Error fetching rankings:', error)
    loading.value = false
  }
})

const navigateToProfile = (userId) => {
  router.push(`/user/${userId}`)
}

const formatNumber = (num) => {
  return num.toString().padStart(2, '0')
}
</script>

<template>
  <div class="leaderboard-container">
    <h1 class="leaderboard-title">
      <ion-icon name="trophy-outline"></ion-icon>
      Bestenliste
    </h1>
    
    <div class="rankings-grid">
      <!-- Logicals Ranking -->
      <div class="ranking-card">
        <div class="card-header">
          <div class="header-icon">
            <ion-icon name="grid-outline"></ion-icon>
          </div>
          <div class="header-text">
            <h2>Logikrätsel</h2>
            <span class="subtitle">Top 10 Spieler</span>
          </div>
        </div>
        <div class="ranking-list" v-if="!loading">
          <div 
            v-for="(user, index) in rankings.logicals" 
            :key="user.id"
            class="ranking-item"
            :class="{ 
              'gold': index === 0,
              'silver': index === 1,
              'bronze': index === 2
            }"
            @click="navigateToProfile(user.id)"
          >
            <div class="rank-badge">{{ formatNumber(index + 1) }}</div>
            <div class="user-info">
              <img class="avatar" src="@/assets/bear.svg" :alt="user.username">
              <span class="username">{{ user.username }}</span>
            </div>
            <div class="score">
              <span class="score-number">{{ user.solvedCount }}</span>
              <span class="score-label">gelöst</span>
            </div>
          </div>
        </div>
        <div v-else class="loading">
          <div class="loading-spinner"></div>
        </div>
      </div>

      <!-- Nonograms Ranking -->
      <div class="ranking-card">
        <div class="card-header">
          <div class="header-icon">
            <ion-icon name="apps-outline"></ion-icon>
          </div>
          <div class="header-text">
            <h2>Nonogramme</h2>
            <span class="subtitle">Top 10 Spieler</span>
          </div>
        </div>
        <div class="ranking-list" v-if="!loading">
          <div 
            v-for="(user, index) in rankings.nonograms" 
            :key="user.id"
            class="ranking-item"
            :class="{ 
              'gold': index === 0,
              'silver': index === 1,
              'bronze': index === 2
            }"
            @click="navigateToProfile(user.id)"
          >
            <div class="rank-badge">{{ formatNumber(index + 1) }}</div>
            <div class="user-info">
              <img class="avatar" src="@/assets/bear.svg" :alt="user.username">
              <span class="username">{{ user.username }}</span>
            </div>
            <div class="score">
              <span class="score-number">{{ user.solvedCount }}</span>
              <span class="score-label">gelöst</span>
            </div>
          </div>
        </div>
        <div v-else class="loading">
          <div class="loading-spinner"></div>
        </div>
      </div>

      <!-- Linelogs Ranking -->
      <div class="ranking-card">
        <div class="card-header">
          <div class="header-icon">
            <ion-icon name="git-network-outline"></ion-icon>
          </div>
          <div class="header-text">
            <h2>Linelogs</h2>
            <span class="subtitle">Top 10 Spieler</span>
          </div>
        </div>
        <div class="ranking-list" v-if="!loading">
          <div 
            v-for="(user, index) in rankings.linelogs" 
            :key="user.id"
            class="ranking-item"
            :class="{ 
              'gold': index === 0,
              'silver': index === 1,
              'bronze': index === 2
            }"
            @click="navigateToProfile(user.id)"
          >
            <div class="rank-badge">{{ formatNumber(index + 1) }}</div>
            <div class="user-info">
              <img class="avatar" src="@/assets/bear.svg" :alt="user.username">
              <span class="username">{{ user.username }}</span>
            </div>
            <div class="score">
              <span class="score-number">{{ user.solvedCount }}</span>
              <span class="score-label">gelöst</span>
            </div>
          </div>
        </div>
        <div v-else class="loading">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.leaderboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
}

.leaderboard-title {
  text-align: center;
  margin-bottom: 48px;
  font-size: 36px;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  ion-icon {
    color: #FFD700;
    font-size: 32px;
  }
}

.rankings-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.ranking-card {
  background: white;
  border-radius: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.08);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  }
}

.card-header {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  .header-icon {
    background: white;
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);

    ion-icon {
      font-size: 24px;
      color: #2196F3;
    }
  }

  .header-text {
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .subtitle {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
  }
}

.ranking-list {
  padding: 20px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8f9fa;

  &:hover {
    background: #e9ecef;
    transform: translateX(4px);
  }

  &.gold .rank-badge { 
    background: linear-gradient(135deg, #FFD700 0%, #FDB931 100%);
    color: #1a1a1a;
  }
  &.silver .rank-badge { 
    background: linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%);
    color: #1a1a1a;
  }
  &.bronze .rank-badge { 
    background: linear-gradient(135deg, #CD7F32 0%, #B36A2B 100%);
    color: white;
  }
}

.rank-badge {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  background: #e9ecef;
  color: #666;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  margin: 0 12px;

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    object-fit: cover;
  }

  .username {
    font-weight: 500;
    color: #1a1a1a;
  }
}

.score {
  text-align: right;
  
  .score-number {
    font-weight: 600;
    color: #2196F3;
    font-size: 18px;
  }

  .score-label {
    font-size: 12px;
    color: #666;
    margin-left: 4px;
  }
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 1200px) {
  .rankings-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .rankings-grid {
    grid-template-columns: 1fr;
  }

  .leaderboard-container {
    padding: 20px 12px;
  }
}
</style> 