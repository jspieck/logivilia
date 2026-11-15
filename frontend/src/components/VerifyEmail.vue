<template>
  <div class="verify-page">
    <h2>{{ $t('verify.title') }}</h2>
    <p v-if="state === 'pending'">{{ $t('verify.pending') }}</p>
    <p v-else-if="state === 'done'" class="verify-ok">
      {{ $t('verify.done') }}
    </p>
    <p v-else class="error-message">{{ error }}</p>
    <router-link to="/" class="navLink">{{ $t('common.toHome') }}</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AuthenticationService from '@/services/AuthenticationService'
import { useMainStore } from '@/store/store'
import { apiErrorMessage } from '@/i18n'

const props = defineProps({ token: { type: String, required: true } })
const store = useMainStore()
const state = ref('pending')
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await AuthenticationService.verify(props.token)
    // Logged in as the same user (e.g. same browser): update the stored user,
    // so the "please confirm" banner disappears.
    if (store.user && data.user && store.user.id === data.user.id) {
      store.setUser({ ...store.user, ...data.user })
    }
    state.value = 'done'
  } catch (err) {
    error.value = apiErrorMessage(err)
    state.value = 'failed'
  }
})
</script>

<style scoped>
.verify-page {
  padding: 2rem;
}
.verify-ok {
  color: #2e7d32;
  margin-bottom: 1rem;
}
</style>
