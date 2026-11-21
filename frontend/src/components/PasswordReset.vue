<template>
  <div>
    <h2>{{ $t('reset.title') }}</h2>
    
    <o-field :label="$t('common.password')">
      <o-input
        type="password"
        v-model="password"
        class="inputForm"/>
    </o-field>  

    <o-field :label="$t('reset.confirm')">
      <o-input
        type="password"
        v-model="passwordCheck"
        class="inputForm"/>
    </o-field>

    <o-button variant="primary" @click="changePassword">{{ $t('reset.submit') }}</o-button>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMainStore } from '@/store/store'
import { useOruga } from '@oruga-ui/oruga-next'
import AuthenticationService from '@/services/AuthenticationService'
import i18n, { apiErrorMessage } from '@/i18n'

export default {
  name: 'PasswordReset',
  setup() {
    const route = useRoute()
    const store = useMainStore()
    const oruga = useOruga()
    
    const password = ref('')
    const passwordCheck = ref('')
    const error = ref(null)
    const token = ref(null)

    onMounted(() => {
      token.value = route.params.token
    })

    const changePassword = async () => {
      if (password.value === passwordCheck.value) {
        try {
          const response = await AuthenticationService.reset(token.value, {
            password: password.value
          })
          
          store.setToken(response.data.token)
          store.setUser(response.data.user)
          error.value = null
          
          oruga.notification.open({
            duration: 3000,
            message: i18n.global.t('messages.PASSWORD_CHANGED'),
            position: 'top-right',
            type: 'info',
            closable: false
          })
        } catch (err) {
          error.value = apiErrorMessage(err)
        }
      } else {
        error.value = i18n.global.t('clientErrors.PASSWORD_MISMATCH')
      }
    }

    return {
      password,
      passwordCheck,
      error,
      changePassword
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