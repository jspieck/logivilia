<template>
  <div>
    <h2>Dashboard</h2>
    <div v-if="user">
      <p>Name: {{ user.username }}</p>
      <p>Email: {{ user.email }}</p>
      <div class="stats">
        <h3>Statistiken</h3>
        <p>Gelöste Nonogramme: {{ solvedNonograms?.length || 0 }}</p>
        <p>Gelöste Linelogs: {{ solvedLinelogs?.length || 0 }}</p>
        <p>Gelöste Logikrätsel: {{ solvedLogicals?.length || 0 }}</p>
      </div>
    </div>
    <div v-else>
      <p>Lädt...</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/store/store'
import { storeToRefs } from 'pinia'
import UserService from '@/services/UserService'

export default {
  name: 'Dashboard',
  setup() {
    const router = useRouter()
    const store = useMainStore()
    const { user } = storeToRefs(store)
    
    const solvedNonograms = ref([])
    const solvedLinelogs = ref([])
    const solvedLogicals = ref([])

    const getUserData = async () => {
      try {
        if (!store.isUserLoggedIn || !user.value) {
          router.push('/')
          return
        }

        const response = await UserService.show(user.value.id)
        solvedNonograms.value = response.data.solvedNonograms
        solvedLinelogs.value = response.data.solvedLinelogs
        solvedLogicals.value = response.data.solvedLogicals
      } catch (error) {
        console.error('Error fetching user data:', error)
        router.push('/')
      }
    }

    onMounted(async () => {
      await getUserData()
    })

    return {
      user,
      solvedNonograms,
      solvedLinelogs,
      solvedLogicals
    }
  }
}
</script>

<style scoped>
.stats {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

h3 {
  margin-bottom: 1rem;
}
</style>