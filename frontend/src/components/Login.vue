<template>
<div>
  <h2>Login</h2>
  <form v-on:submit='login'>
    <input type='text' name='email' /><br>
    <input type='password' name='password' /><br>
    <input type='submit' value='Login' />
  </form>
</div>
</template>

<script>
import axios from 'axios';
import router from '../router';

export default {
  name: 'Login',
  methods: {
    login: (e) => {
      e.preventDefault();
      const email = e.target.elements.email.value;
      const password = e.target.elements.password.value;
      const login = () => {
        const data = {
          email,
          password,
        };
        axios.post('/api/login', data)
          .then(() => {
            router.push('/dashboard');
          }).catch(() => {});
      };
      login();
    },
  },
};
</script>
