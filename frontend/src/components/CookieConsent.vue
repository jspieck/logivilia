<template>
  <div v-if="!accepted" class="cookie-consent">
    <span>{{ $t('cookie.text') }} <router-link to="/datenschutz" class="navLink">{{ $t('cookie.more') }}</router-link></span>
    <o-button variant="primary" @click="accept">{{ $t('cookie.ok') }}</o-button>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'CookieConsent',
  setup() {
    const accepted = ref(localStorage.getItem('cookieConsent') === 'true')
    

    const accept = () => {
      localStorage.setItem('cookieConsent', 'true')
      accepted.value = true
    }

    return {
      accepted,
      accept
    }
  }
}
</script>

<style scoped>
.cookie-consent {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
  z-index: 1000;
}
</style>