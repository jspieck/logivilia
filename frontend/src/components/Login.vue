<template>
  <div>
    <h2>Anmeldung</h2>
    <b-field label="Email">
      <b-input
        type="email"
        v-model="email"
        required>
      </b-input>
    </b-field>

    <b-field label="Passwort">
      <b-input
        type="password"
        v-model="password"
        required>
      </b-input>
    </b-field>

    <b-button
      @click="login"
      type="is-primary"
      :loading="isLoading">
      Anmelden
    </b-button>

    <div v-if="error" class="error-message" v-html="error"/>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/store/store'
import AuthenticationService from '@/services/AuthenticationService'

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
        error.value = err.response.data.error
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
