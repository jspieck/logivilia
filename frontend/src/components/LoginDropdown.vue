<template>
  <div class="login-dropdown-container">
    <a
      ref="triggerRef"
      class="navbar-item login-button"
      role="button"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      @click="toggle"
    >
      <span>{{ t('login.button') }}</span>
      <o-icon :icon="isOpen ? 'chevron-up' : 'chevron-down'"></o-icon>
    </a>

    <!-- Rendered at the end of <body>, so the navbar's stacking and overflow
         rules cannot hide or cover it (Oruga's dropdown did, on mobile). -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="login-backdrop"
        @pointerdown.self="backdropPressed = true"
        @click.self="onBackdropClick"
      ></div>
      <div
        v-if="isOpen"
        ref="panelRef"
        class="login-panel"
        :class="{ 'login-panel--anchored': !isMobile }"
        :style="panelStyle"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <form class="login-card" novalidate @submit.prevent="handleLogin">
          <div class="login-header">
            <h3 id="login-title">{{ t('login.welcomeBack') }}</h3>
            <p>{{ t('login.subtitle') }}</p>
            <button type="button" class="close-button" :aria-label="t('common.close')" @click="close">
              <o-icon icon="close"></o-icon>
            </button>
          </div>

          <div class="login-form">
            <div class="form-group">
              <label for="login-email">{{ t('common.email') }}</label>
              <div class="input-wrapper">
                <input
                  id="login-email"
                  ref="emailRef"
                  v-model="loginForm.email"
                  type="email"
                  name="email"
                  autocomplete="username"
                  :placeholder="t('login.emailPlaceholder')"
                  required
                />
                <span class="icon-wrapper">
                  <o-icon icon="email"></o-icon>
                </span>
              </div>
            </div>

            <div class="form-group">
              <label for="login-password">{{ t('common.password') }}</label>
              <div class="input-wrapper">
                <input
                  id="login-password"
                  v-model="loginForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  name="password"
                  autocomplete="current-password"
                  :placeholder="t('login.passwordPlaceholder')"
                  required
                />
                <span class="icon-wrapper">
                  <o-icon icon="lock"></o-icon>
                </span>
                <button
                  type="button"
                  class="toggle-password"
                  :aria-label="showPassword ? t('common.hidePassword') : t('common.showPassword')"
                  @click="showPassword = !showPassword"
                >
                  <o-icon :icon="showPassword ? 'eye-off' : 'eye'"></o-icon>
                </button>
              </div>
            </div>

            <div class="forgot-password">
              <router-link :to="{ path: '/forgot' }">
                {{ t('login.forgot') }}
              </router-link>
            </div>

            <button type="submit" class="button is-primary is-fullwidth" :disabled="isLoading">
              <span v-if="!isLoading">{{ t('login.button') }}</span>
              <span v-else class="spinner"></span>
            </button>

            <div v-if="error" class="error-message" role="alert">{{ error }}</div>

            <div class="register-link">
              {{ t('login.noAccount') }}
              <router-link :to="{ path: '/register' }">
                {{ t('login.register') }}
              </router-link>
            </div>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMainStore } from '@/store/store'
import { useNotification } from '@/composables/useNotification'
import AuthenticationService from '@/services/AuthenticationService'
import { apiErrorMessage } from '@/i18n'

// The panel closes only on purpose: the X button, Escape, a click that both
// starts and ends on the backdrop, a page change, or a successful login.
// Selecting text in a field and releasing the mouse outside the panel, or
// picking a password-manager suggestion, must not close it (it did with
// Oruga's dropdown, which treated every "outside" click as a close).

const MOBILE_BREAKPOINT = 768

const { t } = useI18n()
const mainStore = useMainStore()
const route = useRoute()
const { showNotification } = useNotification()

const loginForm = ref({ email: '', password: '' })
const error = ref(null)
const isLoading = ref(false)
const showPassword = ref(false)
const isOpen = ref(false)
const backdropPressed = ref(false)

const triggerRef = ref(null)
const panelRef = ref(null)
const emailRef = ref(null)

const viewportWidth = ref(window.innerWidth)
const isMobile = computed(() => viewportWidth.value <= MOBILE_BREAKPOINT)

// Desktop: below the Login link, right edges aligned. Mobile: centred (CSS).
const anchor = ref({ top: 0, right: 0 })
const panelStyle = computed(() => isMobile.value
  ? {}
  : { top: `${anchor.value.top}px`, right: `${anchor.value.right}px` })

function updateAnchor () {
  viewportWidth.value = window.innerWidth
  const rect = triggerRef.value?.getBoundingClientRect()
  if (!rect) return
  anchor.value = {
    top: Math.round(rect.bottom + 8),
    right: Math.max(8, Math.round(window.innerWidth - rect.right))
  }
}

async function open () {
  updateAnchor()
  error.value = null
  isOpen.value = true
  await nextTick()
  emailRef.value?.focus()
}

function close () {
  isOpen.value = false
  backdropPressed.value = false
}

function toggle () {
  if (isOpen.value) close()
  else open()
}

function onBackdropClick () {
  if (backdropPressed.value) close()
  backdropPressed.value = false
}

function onDocumentKeydown (event) {
  if (isOpen.value && event.key === 'Escape') close()
}

onMounted(() => {
  window.addEventListener('resize', updateAnchor)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateAnchor)
  document.removeEventListener('keydown', onDocumentKeydown)
})

// "Passwort vergessen?" and "Registrieren" navigate away.
watch(() => route.fullPath, close)

const handleLogin = async () => {
  if (isLoading.value) return
  if (!loginForm.value.email || !loginForm.value.password) {
    error.value = t('login.missingFields')
    return
  }
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
      message: t('login.success'),
      type: 'success'
    })
    close()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-dropdown-container {
  position: relative;
}

.login-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1000;
}

.login-panel {
  position: fixed;
  z-index: 1001;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);

  // Mobile: centred dialog.
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100vw - 32px);
  max-width: 340px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;

  &--anchored {
    left: auto;
    transform: none;
    width: 320px;
  }
}

.login-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
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
    cursor: pointer;
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.3s;

    &:hover,
    &:focus-visible {
      background-color: rgba(255, 255, 255, 0.2);
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
      margin: 0;
      padding: 12px 40px 12px 40px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fafafa;
      font-size: 0.95rem;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus {
        background: #fff;
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
      pointer-events: none;
    }

    .toggle-password {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      color: #aaa;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;

      &:hover,
      &:focus-visible {
        color: #6e8efb;
        outline: none;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .login-form .input-wrapper input {
    font-size: 16px; /* Prevents iOS zoom on input focus */
  }
}
</style>
