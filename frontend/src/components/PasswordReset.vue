<template>
  <div>
    <h2>Ändern des Passworts</h2>
    
    <b-field label="Passwort">
      <input type="password"
        v-model="password"/>
    </b-field>  

    <b-field label="Passwort (Kontrolle)">
      <input type="password"
        v-model="passwordCheck"/>
    </b-field>

    <button @click="changePassword">Passwort ändern</button>
    <div class="error" v-html="error"/>
  </div>
</template>

<script>
import AuthenticationService from '@/services/AuthenticationService';

export default {
  name: 'PasswordReset',
  data() {
    return {
      password: '',
      passwordCheck: '',
      error: null,
      token: null
    };
  },
  mounted() {
    this.token = this.$store.state.route.params.token;
  },
  methods: {
    async changePassword() {
      if (this.password == this.passwordCheck) {
        try {
          const response = await AuthenticationService.reset(this.token, 
          {
            password: this.password
          });
          this.$store.dispatch('setToken', response.data.token);
          this.$store.dispatch('setUser', response.data.user);
          this.error = null;
          this.$buefy.toast.open({
            duration: 3000,
            message: `Das Passwort wurde erfolgreich geändert und eine Bestätigungs E-Mail versendet`,
            position: 'is-top-right',
            queue: false,
            closable: false,
            type: 'is-info'
          });
          console.log(response.data);
        } catch (err) {
          this.error = err.response.data.error;
        }
      } else {
        this.error = "Die eingegebenen Passwörter stimmen nicht überein."
      }
    }
  },
};
</script>
