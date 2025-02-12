<template>
  <div v-if="!accepted" class="cookie-consent">
    <span>{{ consentText }}</span>
    <b-button @click="accept">{{ buttonText }}</b-button>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'CookieConsent',
  setup() {
    const accepted = ref(localStorage.getItem('cookieConsent') === 'true')
    
    const consentText = 'Diese Website benutzt Cookies, um das beste Nutzererlebnis auf der Seite zu ermöglichen.'
    const buttonText = 'Verstanden'

    const accept = () => {
      localStorage.setItem('cookieConsent', 'true')
      accepted.value = true
    }

    return {
      accepted,
      consentText,
      buttonText,
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