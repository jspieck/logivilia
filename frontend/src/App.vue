<template>
  <div id="app">
    <div id="mainContainer">
      <div class="header">
        <div class="headerContainer">
          <!--<img class="logo" width=35 src="@/assets/logo.svg">
          <div>
            <router-link :to="{ name: 'Dashboard'}">Dashboard</router-link>
            <router-link :to="{ name: 'Login'}">Login</router-link>
            <router-link :to="{ name: 'Logical'}">Logical</router-link>
            <a href="#" v-on:click="logout">Logout</a>
          </div>-->
          <!--<nav class="navMenu">
            <ul id="navList" class="navList">
              <li v-for="page in pages" :id="page.id" v-bind:key="page.id" class="navItem">
                <router-link :to="{ name: page.link}" class="navLink">{{page.name}}</router-link>
              </li>
            </ul>
          </nav>-->
          <b-navbar>
            <template slot="brand">
              <b-navbar-item tag="router-link" :to="{ path: '/' }">
                <img
                    src="@/assets/logo.svg"
                    alt="Logivilia"
                >
              </b-navbar-item>
            </template>
            <template slot="start">
              <b-navbar-item tag="router-link" :to="{ path: '/' }">
                Startseite
              </b-navbar-item>
              <b-navbar-item tag="router-link" :to="{ path: '/nonogram-overview' }">
                Nonogramm
              </b-navbar-item>
              <b-navbar-item tag="router-link" :to="{ path: '/logical-overview' }">
                Logikrätsel
              </b-navbar-item>
              <b-navbar-item tag="router-link" :to="{ path: '/linelog-overview' }">
                Linelog
              </b-navbar-item>
              <!-- <b-navbar-dropdown label="Logical">
                <b-navbar-item tag="router-link" :to="{ path: '/logicalSolve' }">
                  Logical
                </b-navbar-item>
                <b-navbar-item tag="router-link" :to="{ path: '/logical-overview' }">
                  LogicalOverview
                </b-navbar-item>
              </b-navbar-dropdown> -->
            </template>

            <!--<template slot="end">
              <b-dropdown position="is-bottom-left" append-to-body aria-role="menu" trap-focus>
                <a
                  class="navbar-item"
                  slot="trigger"
                  role="button">
                  <span>Login</span>
                  <b-icon icon="menu-down"></b-icon>
                </a>
                <b-dropdown-item
                  aria-role="menu-item"
                  :focusable="false"
                  custom
                  paddingless>
                  <form action="">
                    <div class="modal-card" style="width:300px;">
                      <section class="modal-card-body">
                        <b-field label="Email">
                          <b-input
                            type="email"
                            placeholder="Your email"
                            required>
                          </b-input>
                        </b-field>
                        <b-field label="Password">
                          <b-input
                            type="password"
                            password-reveal
                            placeholder="Your password"
                            required>
                          </b-input>
                        </b-field>
                        <b-checkbox>Remember me</b-checkbox>
                      </section>
                      <footer class="modal-card-foot">
                          <button class="button is-primary">Login</button>
                      </footer>
                    </div>
                  </form>
                </b-dropdown-item>
              </b-dropdown>
            </template>-->
          </b-navbar>
        </div>
      </div>
      <div class="body">
        <div class="bodyContainer">
          <router-view/>
        </div>
      </div>
      <footer class="logFooter">
        <div class="content has-text-centered">
          <p>
            <strong>Logivilia</strong> by Jan Spieck. ©{{ new Date().getFullYear() }}
          </p>
        </div>
      </footer>
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
  font-size: 15px;
  line-height: 23px;
  font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4 {
  color: #262664;
}

#mainContainer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.logFooter {
  background: #fcfcfc;
  border-top: 2px solid #f2f2f2;
  flex-grow: 0;
  flex-shrink: 1;
  height: 55px;
}

#app {
  text-align: left;
  color: #2c3e50;
  background: #f5f5f5;
  height: 100%;
}

.body {
  flex-grow: 1;
  flex-shrink: 1;
  background: #f5f5f5;
  overflow-y: overlay;
}

.header {
  /* height: 60px;
  line-height: 60px;
  padding: 0 100px; */
  border-bottom: 2px solid #f2f2f2;
  background: #fff; /* #fe4f6c; */
  flex-grow: 0;
  flex-shrink: 1;
}

.headerContainer, .bodyContainer {
  max-width: 1000px;
  padding: 0;
  margin: auto;
}

@media (max-width: 1000px) {
  #app {
    background: #ffffffab;
  }
  .body {
    background: inherit;
  }
  .bodyContainer {
    max-width: 100%;
  }
  .overviewPage {
    padding: 20px;
  }
  .puzzleContainer {
    margin: 0;
    border: none;
  }
  .websiteText {
    margin: 0;
  }
  .imgCard {
    height: 300px;
    background-size: auto;
  }
  .subtile {
    display: block;
    width: 100%;
    padding: 0px;
  }
  .puzzleBody {
    background: none;
  }
}
.subimg {
  width: 300px;
}
@media (max-width: 350px) {
  .subimg {
    width: 100%;
  }
}

.logo {
  vertical-align: middle;
  font-size: 24px;
  color: #2128bd;
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
}

.navLink:hover {
  color: #da1260;
}
</style>
