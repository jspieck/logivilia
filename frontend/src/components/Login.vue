<template>
<div>
  <h2>Anmeldung</h2>
  <form>
    <input type='text' name='email' /><br>
    <input type='password' name='password' /><br>
    <button @click="login"> Anmelden </button>
  </form>
  <div v-html="error"/>
</div>
</template>

<script>
import AuthenticationService from '@/services/AuthenticationService';

export default {
  name: 'Login',
  data() {
    return {
      error: null
    };
  },
  methods: {
    async login() {
      try {
        const response = await AuthenticationService.login({
          email: this.email,
          password: this.password
        });
        this.$store.dispatch('setToken', response.data.token);
        this.$store.dispatch('setUser', response.data.user);
        this.error = null;
        console.log(response.data);
      } catch (err) {
        this.error = err.response.data.error;
      }
    },
  },
};
</script>
