<template>
  <div class="forgot-container">
    <div class="forgot-card">
      <div class="card-header">
        <h2>{{ $t('login.forgot') }}</h2>
        <div class="header-icon">
          <ion-icon name="lock-open-outline" size="large"></ion-icon>
        </div>
      </div>

      <div class="card-content">
        <p class="instruction">
          {{ $t('forgot.instruction') }}
        </p>

        <o-field :label="$t('common.email')">
          <o-input
            class="email-input"
            v-model="forgottenEmail"
            type="email"
            :placeholder="$t('forgot.placeholder')"
            :class="{ 'has-error': error }"
          />
        </o-field>

        <div class="action-buttons">
          <button class="button is-primary" @click="forgot" :disabled="!forgottenEmail">
            <span>{{ $t('forgot.submit') }}</span>
            <ion-icon name="arrow-forward-outline"></ion-icon>
          </button>
        </div>

        <div v-if="error" class="error-message">
          <ion-icon name="alert-circle-outline"></ion-icon>
          <span>{{ error }}</span>
        </div>

        <p class="register-link">
          {{ $t('login.noAccount') }}
          <router-link to="/register">{{ $t('forgot.registerHere') }}</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.forgot-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
}

.forgot-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.card-header {
  background: #3498db;
  color: white;
  padding: 1rem;
  text-align: center;
  position: relative;

  h2 {
    font-size: 1.8rem;
    margin: 0;
    font-weight: 600;
  }

  .header-icon {
    margin-top: 0.5rem;
    
    ion-icon {
      font-size: 2.5rem;
    }
  }
}

.card-content {
  padding: 2rem;
}

.instruction {
  color: #666;
  line-height: 1.6;
  margin-bottom: 2rem;
  text-align: center;
}

.email-input {
  margin-bottom: 1.5rem;
  
  input {
    width: 100%;
    padding: 0.8rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    transition: border-color 0.3s ease;

    &:focus {
      border-color: #3498db;
      outline: none;
    }
  }

  &.has-error input {
    border-color: #e74c3c;
  }
}

.action-buttons {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 1rem;
  background: #fdeaea;
  color: #e74c3c;
  border-radius: 8px;
  font-size: 0.9rem;

  ion-icon {
    font-size: 1.2rem;
  }
}

.register-link {
  text-align: center;
  margin-top: 2rem;
  color: #666;

  a {
    color: #3498db;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.3s ease;

    &:hover {
      color: #2980b9;
      text-decoration: underline;
    }
  }
}

@media (max-width: 768px) {
  .forgot-container {
    padding: 1rem;
  }

  .forgot-card {
    max-width: 100%;
  }

  .card-header h2 {
    font-size: 1.5rem;
  }
}
</style>

<script>
import { ref } from 'vue'
import AuthenticationService from '@/services/AuthenticationService'
import { useOruga } from '@oruga-ui/oruga-next'
import i18n, { apiErrorMessage } from '@/i18n'

export default {
  name: 'Forgot',
  setup() {
    const forgottenEmail = ref('')
    const error = ref(null)
    const oruga = useOruga()

    const forgot = async () => {
      try {
        await AuthenticationService.forgot({ email: forgottenEmail.value })
        error.value = null
        
        oruga.notification.open({
          duration: 3000,
          message: i18n.global.t('messages.FORGOT_EMAIL_SENT'),
          position: 'top-right',
          variant: 'success',
          closable: true
        })
      } catch (err) {
        error.value = apiErrorMessage(err)
      }
    }

    return {
      forgottenEmail,
      error,
      forgot
    }
  }
}
</script>