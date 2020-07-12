<template>
  <div>
    <h2>Passwort vergessen</h2>

    <p>Geben Sie die E-Mail-Adresse Ihres Accounts ein, damit wir Ihnen eine E-Mail
      zusenden können, welche einen Link zum Zurücksetzen Ihres Passworts enthält.</p>
    <b-field label="E-Mail">
      <input class="inputForm" v-model="forgottenEmail"
        type="email"/>
    </b-field>

    <button @click="forgot">Bestätigen</button>
    <div class="error" v-html="error"/>
  </div>
</template>

<script>
import AuthenticationService from '@/services/AuthenticationService';

export default {
  name: 'Forgot',
  data() {
    return {
      forgottenEmail: '',
      error: null
    };
  },
  methods: {
    async forgot() {
      try {
        const response = await AuthenticationService.forgot({email: this.forgottenEmail});
        this.error = null;
        this.$buefy.toast.open({
          duration: 3000,
          message: `Eine Email wurde erfolgreich an ${this.forgottenEmail} versendet`,
          position: 'is-top-right',
          queue: false,
          closable: false,
          type: 'is-info'
        });
        console.log(response.data);
      } catch (err) {
        this.error = err.response.data.error;
      }
    }
  },
  /* mounted() {
    this.getUserData();
  }, */
};
</script>
