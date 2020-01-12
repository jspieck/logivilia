<template>
  <div id="app">
    <div id="mainContainer">
      <div class="header">
        <div class="headerContainer">
          <img src="./assets/logo.png" class="logo" height="20">
          <!--<div>
            <router-link :to="{ name: 'Dashboard'}">Dashboard</router-link>
            <router-link :to="{ name: 'Login'}">Login</router-link>
            <router-link :to="{ name: 'Logical'}">Logical</router-link>
            <a href="#" v-on:click="logout">Logout</a>
          </div>-->
          <nav class="navMenu">
            <ul id="navList" class="navList">
              <li v-for="page in pages" :id="page.id" v-bind:key="page.id" class="navItem">
                <router-link :to="{ name: page.link}" class="navLink">{{page.name}}</router-link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div class="body">
        <div class="bodyContainer">
          <router-view/>
        </div>
      </div>
      <div class="footer"/>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import router from './router';

export default {
  name: 'App',
  data() {
    return {
      pages: [
        { id: 'home', name: 'Home', link: 'Dashboard' },
        { id: 'login', name: 'Login', link: 'Login' },
        { id: 'logical', name: 'Logical', link: 'Logical' },
        { id: 'nonogram', name: 'Nonogram', link: 'Nonogram' },
      ],
    };
  },
  methods: {
    logout() {
      axios.get('/api/logout')
        .then(() => {
          router.push('/');
        });
    },
  },
};
</script>

<style>
html, body {
  height: 100%;
}

body {
  margin: 0;
}

h1, h2, h3, h4 {
  color: #262664;
}

#mainContainer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.footer {
  height: 100px;
  background: #2b2b2b;
}

#app {
  font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: left;
  color: #2c3e50;
  background: #f5f5f5;
  height: 100%;
}

.body {
  flex-grow: 1;
}

.header {
  height: 60px;
  line-height: 60px;
  border-bottom: 2px solid #f2f2f2;
  padding: 0 100px;
  background: #fff; /* #fe4f6c; */
}

.headerContainer, .bodyContainer {
  max-width: 1200px;
  padding: 0;
  margin: auto;
}

.logo {
  vertical-align: middle;
}

.navMenu {
  float: right;
  position: relative;
  z-index: 200;
  overflow: hidden;
}

.navList {
  list-style: none;
  margin: 0;
  padding: 0;
}

.navList li {
  float: left;
  margin: 0;
  padding: 0;
  position: relative;
  cursor: pointer;
  padding-right: 40px;
}

.navLink {
  color: #000;
  letter-spacing: 0;
  font-style: normal;
  text-decoration: none;
  text-transform: uppercase;
}

.navLink:hover {
  color: #da1260;
}
</style>
