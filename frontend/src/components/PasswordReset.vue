<template>
  <div>
    <h2>Ändern des Passworts</h2>
    
    <b-field label="Passwort">
      <b-input
        type="password"
        v-model="password"
        class="inputForm"/>
    </b-field>  

    <b-field label="Passwort (Kontrolle)">
      <b-input
        type="password"
        v-model="passwordCheck"
        class="inputForm"/>
    </b-field>

    <b-button @click="changePassword">Passwort ändern</b-button>
    <div class="error" v-html="error"/>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMainStore } from '@/store/store'
import AuthenticationService from '@/services/AuthenticationService'

export default {
  name: 'PasswordReset',
  setup() {
    const route = useRoute()
    const store = useMainStore()
    
    const password = ref('')
    const passwordCheck = ref('')
    const error = ref(null)
    const token = ref(null)

    onMounted(() => {
      token.value = route.params.token
    })

    const changePassword = async () => {
      if (password.value === passwordCheck.value) {
        try {
          const response = await AuthenticationService.reset(token.value, {
            password: password.value
          })
          
          store.setToken(response.data.token)
          store.setUser(response.data.user)
          error.value = null
          
          this.$buefy.toast.open({
            duration: 3000,
            message: 'Das Passwort wurde erfolgreich geändert und eine Bestätigungs E-Mail versendet',
            position: 'top-right',
            type: 'info',
            closable: false
          })
          
          console.log(response.data)
        } catch (err) {
          error.value = err.response.data.error
        }
      } else {
        error.value = "Die eingegebenen Passwörter stimmen nicht überein."
      }
    }

    return {
      password,
      passwordCheck,
      error,
      changePassword
    }
  }
}
</script>

<style scoped>
.inputForm {
  width: 100%;
}

.error {
  color: red;
  margin-top: 1rem;
}
</style>