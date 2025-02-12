<template>
  <div>
    <h2>Passwort vergessen</h2>

    <p>Geben Sie die E-Mail-Adresse Ihres Accounts ein, damit wir Ihnen eine E-Mail
      zusenden können, welche einen Link zum Zurücksetzen Ihres Passworts enthält.</p>
    <b-field label="E-Mail">
      <b-input
        class="inputForm"
        v-model="forgottenEmail"
        type="email"
      />
    </b-field>

    <b-button @click="forgot">Bestätigen</b-button>
    <div class="error" v-html="error"/>
  </div>
</template>

<script>
import { ref } from 'vue'
import AuthenticationService from '@/services/AuthenticationService'

export default {
  name: 'Forgot',
  setup() {
    const forgottenEmail = ref('')
    const error = ref(null)

    const forgot = async () => {
      try {
        const response = await AuthenticationService.forgot({ email: forgottenEmail.value })
        error.value = null
        
        this.$buefy.toast.open({
          duration: 3000,
          message: `Eine Email wurde erfolgreich an ${forgottenEmail.value} versendet`,
          position: 'top-right',
          type: 'info',
          closable: false
        })
        
        console.log(response.data)
      } catch (err) {
        error.value = err.response.data.error
      }
    }

    return {
      forgottenEmail,
      error,
      forgot
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