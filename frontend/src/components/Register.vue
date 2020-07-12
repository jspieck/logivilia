<template>
  <div>
    <div class="styledCard columns">
      <div class="column columnLeft is-one-third">
        <h2 class="registerHeader">Registrierung</h2>

        <b-field label="Benutzername">
          <input v-model="username"
            :class="{
              incomplete: (registerTry && username.length == 0),
              complete: (registerTry && username.length > 0)
            }"
            type="text"/>
        </b-field>

        <b-field label="E-Mail">
          <input v-model="email"
            :class="{
              incomplete: (registerTry && email.length == 0),
              complete: (registerTry && email.length > 0)
            }"
            type="email"/>
        </b-field>
        
        <b-field label="Passwort">
          <input type="password"
            :class="{
              incomplete: (registerTry && password.length == 0),
              complete: (registerTry && password.length > 0)
            }"
            v-model="password"/>
        </b-field>  

        <b-field label="Passwort (Kontrolle)">
          <input type="password"
            :class="{
              incomplete: (registerTry && passwordCheck.length == 0),
              complete: (registerTry && passwordCheck.length > 0)
            }"
            v-model="passwordCheck"/>
        </b-field>

        <button @click="register">Registrieren</button>
        <p class="error" v-html="error"/>
        <div v-if="registerSuccess">
          <p>Sie haben sich erfolgreich registriert. Sie können sich jetzt anmelden.</p>
        </div>
      </div>
      <div class="column columnRight">
        <img class="registerImg" src="../assets/registerNoBack.png"/>
        <h2><strong>Registrieren Sie sich kostenlos!</strong></h2>
        <p>Genießen Sie eine Vielzahl an Rätseln.</p>
      </div>
    </div>
  </div>
</template>

<script>
import AuthenticationService from '@/services/AuthenticationService';

export default {
  name: 'Register',
  data() {
    return {
      email: '',
      password: '',
      username: '',
      passwordCheck: '',
      error: null,
      registerTry: false,
      registerSuccess: false
    };
  },
  methods: {
    async register() {
      this.registerTry = true;
      try {
        if (this.email.length > 0 && this.username.length > 0 && this.password == this.passwordCheck) {
          const response = await AuthenticationService.register({
            username: this.username,
            email: this.email,
            password: this.password
          });
          this.$store.dispatch('setToken', response.data.token);
          this.$store.dispatch('setUser', response.data.user);
          this.error = null;
          this.registerSuccess = true;
        } else {
          this.error = "Bitte die nötigen Felder ausfüllen und das Übereinstimmen der Passwörter überprüfen.";
        }
      } catch (err) {
        this.error = err.response.data.error;
      }
    }
  },
};
</script>

<style scoped>
  .complete {
    border: 1px solid green;
  }
  .incomplete {
    border: 1px solid red;
  }
  .error {
    color: red;
  }
  .styledCard {
    display: inline-block;
    margin: 20px auto;
    width: 100%;
    box-sizing: border-box;
    background: white;
    -webkit-box-shadow: 0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06)!important;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06)!important;
    border-radius: 10px;
  }
  .registerImg {
    width: 500px;
  }
  .registerHeader {
    margin-bottom: 30px;
  }
  .styledCard .field {
    margin-bottom: 1rem;
  }
  .styledCard button {
    margin-top: 10px;
  }
  .styledCard .column {
    padding: 20px 70px;
    padding-right: 0;
  }
  .styledCard input, .styledCard button {
    background-color: #ebeefc;
  }
  .styledCard input:focus {
    background: #fff;
    border: 1px solid #986ff3;
    outline: none;
  }
  .styledCard .columnRight {
    display: flex;
    flex-direction: column;
    justify-content: center;  /* Centering y-axis */
    align-items :center; /* Centering x-axis */
    padding-left: 0;
    background: #d2d9f8;
    border-radius: 10px;
  }
  .styledCard .columnRight h2 {
    margin-top: 0;
    margin-bottom: 0;
  }
</style>
