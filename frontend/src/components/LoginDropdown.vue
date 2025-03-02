<template>
  <div class="login-dropdown-container">
    <o-dropdown 
      v-model:active="isActive"
      position="bottom-left"
      aria-role="menu"
      trap-focus
      class="enhanced-dropdown"
      :append-to-body="true"
      :mobile-modal="true"
      :close-on-click="false"
    >
      <template #trigger>
        <a class="navbar-item login-button" role="button">
          <span>Login</span>
          <o-icon icon="chevron-down"></o-icon>
        </a>
      </template>

      <div class="login-card">
        <div class="login-header">
          <h3>Willkommen zurück!</h3>
          <p>Melden Sie sich an, um fortzufahren</p>
          <button class="close-button" @click="closeDropdown">
            <o-icon icon="times"></o-icon>
          </button>
        </div>
        
        <div class="login-form">
          <div class="form-group">
            <label for="email">E-Mail</label>
            <div class="input-wrapper">
              <input 
                id="email"
                type="email" 
                v-model="loginForm.email"
                placeholder="Ihre E-Mail-Adresse"
              />
              <span class="icon-wrapper">
                <o-icon icon="email"></o-icon>
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="password">Passwort</label>
            <div class="input-wrapper">
              <input 
                id="password"
                :type="showPassword ? 'text' : 'password'" 
                v-model="loginForm.password"
                placeholder="Ihr Passwort"
              />
              <span class="icon-wrapper">
                <o-icon icon="lock"></o-icon>
              </span>
              <span 
                class="toggle-password" 
                @click="showPassword = !showPassword"
              >
                <o-icon :icon="showPassword ? 'eye-off' : 'eye'"></o-icon>
              </span>
            </div>
          </div>

          <div class="forgot-password">
            <router-link :to="{ path: '/forgot' }">
              Passwort vergessen?
            </router-link>
          </div>

          <button 
            class="login-submit-button"
            @click="handleLogin"
            :disabled="isLoading"
          >
            <span v-if="!isLoading">Login</span>
            <span v-else class="spinner"></span>
            <span class="button-glow"></span>
          </button>

          <div v-if="error" class="error-message">{{ error }}</div>
          
          <div class="register-link">
            Noch kein Konto? 
            <router-link :to="{ path: '/register' }">
              Registrieren
            </router-link>
          </div>
        </div>
      </div>
    </o-dropdown>
    <div class="dropdown-overlay" v-if="isActive" @click="closeDropdown"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/store/store'
import { useNotification } from '@/composables/useNotification'
import AuthenticationService from '@/services/AuthenticationService'

// Router and store setup
const router = useRouter()
const mainStore = useMainStore()
const { showNotification } = useNotification()

// Reactive state
const loginForm = ref({
  email: '',
  password: ''
})
const error = ref(null)
const isLoading = ref(false)
const showPassword = ref(false)
const isActive = ref(false)

// Methods
const handleLogin = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await AuthenticationService.login({
      email: loginForm.value.email,
      password: loginForm.value.password
    })

    mainStore.setToken(response.data.token)
    mainStore.setUser(response.data.user)
    
    loginForm.value = { email: '', password: '' }
    showNotification({
      message: 'Erfolgreich eingeloggt',
      type: 'success'
    })
    
    // Close dropdown after successful login
    closeDropdown()
  } catch (err) {
    error.value = err.response?.data?.error || 'Ein Fehler ist aufgetreten'
  } finally {
    isLoading.value = false
  }
}

const closeDropdown = () => {
  isActive.value = false
}
</script>

<style lang="scss" scoped>
.login-dropdown-container {
  position: relative;
}

.dropdown-content {
  background-color: transparent!important;
}

.enhanced-dropdown {
  height: 100%;

  :deep(.o-drop__menu) {
    padding: 0;
    border-radius: 12px;
    border: none;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    overflow: visible;
    flex-grow: 0;
    flex-shrink: 0;
    height: auto;
    z-index: 1001 !important;
    width: auto!important;
    
    @media (max-width: 768px) {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: auto !important;
      max-width: 320px;
      margin: 0 !important;
    }
  }
}

.login-card {
  width: 300px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  
  @media (max-width: 768px) {
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
  }
}

.login-header {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  padding: 1.5rem;
  text-align: center;
  position: relative;
  
  h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
  }
  
  p {
    margin: 0.5rem 0 0;
    opacity: 0.9;
    font-size: 0.9rem;
  }
  
  .close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background: transparent;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.3s;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    &:focus {
      outline: none;
    }
  }
}

.login-form {
  padding: 1.5rem;
  
  .form-group {
    margin-bottom: 1.2rem;
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #555;
      font-size: 0.9rem;
    }
  }
  
  .input-wrapper {
    position: relative;
    
    input {
      width: 100%;
      padding: 20px 20px 20px 40px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.9rem;
      transition: all 0.3s;
      
      &:focus {
        border-color: #6e8efb;
        box-shadow: 0 0 0 3px rgba(110, 142, 251, 0.2);
        outline: none;
      }
    }
    
    .icon-wrapper {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #aaa;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
    }
    
    .toggle-password {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #aaa;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      
      &:hover {
        color: #6e8efb;
      }
    }
  }
}

.forgot-password {
  text-align: right;
  margin-bottom: 1.2rem;
  
  a {
    color: #6e8efb;
    font-size: 0.8rem;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.login-submit-button {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  
  &:hover {
    box-shadow: 0 5px 15px rgba(110, 142, 251, 0.4);
    background: linear-gradient(135deg, #4e6ecb, #a777e3);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
  }
  
  .button-glow {
    position: absolute;
    width: 50px;
    height: 100%;
    top: 0;
    left: -100px;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.3) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: glow 2s infinite;
    pointer-events: none;
  }
}

.error-message {
  color: #f44336;
  margin-top: 1rem;
  text-align: center;
  font-size: 0.9rem;
}

.register-link {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: #666;
  
  a {
    color: #6e8efb;
    font-weight: 500;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes glow {
  0% { left: -100px; }
  100% { left: 100%; }
}

// Mobile responsiveness
@media (max-width: 768px) {
  .login-form {
    .input-wrapper input {
      font-size: 16px; /* Prevents iOS zoom on input focus */
    }
  }
}
</style> 