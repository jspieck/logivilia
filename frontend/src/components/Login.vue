<template>
  <div>
    <h2>{{ $t('login.title') }}</h2>
    <o-field :label="$t('common.email')">
      <o-input
        type="email"
        v-model="email"
        required>
      </o-input>
    </o-field>

    <o-field :label="$t('common.password')">
      <o-input
        type="password"
        v-model="password"
        required>
      </o-input>
    </o-field>

    <o-button
      @click="login"
      variant="primary"
      :disabled="isLoading">
      {{ $t('login.submit') }}
    </o-button>

    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/store/store'
import AuthenticationService from '@/services/AuthenticationService'
import { apiErrorMessage } from '@/i18n'

export default {
  name: 'LoginComponent',
  setup() {
    const store = useMainStore()
    const router = useRouter()
    
    const email = ref('')
    const password = ref('')
    const error = ref(null)
    const isLoading = ref(false)

    const login = async () => {
      try {
        isLoading.value = true
        const response = await AuthenticationService.login({
          email: email.value,
          password: password.value
        })
        
        store.setToken(response.data.token)
        store.setUser(response.data.user)
        error.value = null
        
        router.push('/')
      } catch (err) {
        error.value = apiErrorMessage(err)
      } finally {
        isLoading.value = false
      }
    }

    return {
      email,
      password,
      error,
      isLoading,
      login
    }
  }
}
</script>

<style scoped>
.error-message {
  color: red;
  margin-top: 1rem;
}
</style>
