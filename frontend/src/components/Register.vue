<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-form">
        <h2 class="register-title">Registrieren</h2>
        <p class="register-subtitle">Erstellen Sie ein kostenloses Konto</p>

        <div class="form-group" :class="{ 'has-error': registerTry && !username }">
          <label>Benutzername</label>
          <div class="input-wrapper">
            <i class="fas fa-user"></i>
            <input 
              v-model="username"
              type="text"
              placeholder="Benutzername eingeben"
              @focus="focusField('username')"
              @blur="blurField('username')"
            />
            <span class="validation-icon" v-if="registerTry">
              <i class="fas" :class="username ? 'fa-check-circle' : 'fa-times-circle'"></i>
            </span>
          </div>
          <span class="error-message" v-if="registerTry && !username">Benutzername ist erforderlich</span>
        </div>

        <div class="form-group" :class="{ 'has-error': registerTry && !isValidEmail }">
          <label>E-Mail</label>
          <div class="input-wrapper">
            <i class="fas fa-envelope"></i>
            <input 
              v-model="email"
              type="email"
              placeholder="E-Mail eingeben"
              @focus="focusField('email')"
              @blur="blurField('email')"
            />
            <span class="validation-icon" v-if="registerTry">
              <i class="fas" :class="isValidEmail ? 'fa-check-circle' : 'fa-times-circle'"></i>
            </span>
          </div>
          <span class="error-message" v-if="registerTry && !isValidEmail">Gültige E-Mail-Adresse erforderlich</span>
        </div>
        
        <div class="form-group" :class="{ 'has-error': registerTry && !isValidPassword }">
          <label>Passwort</label>
          <div class="input-wrapper">
            <i class="fas fa-lock"></i>
            <input 
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Passwort eingeben"
              @focus="focusField('password')"
              @blur="blurField('password')"
            />
            <span class="toggle-password" @click="showPassword = !showPassword">
              <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
            </span>
          </div>
          
          <div class="password-strength" v-if="password">
            <div class="strength-meter">
              <div class="strength-bar" :style="{ width: passwordStrength + '%', backgroundColor: strengthColor }"></div>
            </div>
            <span class="strength-text" :style="{ color: strengthColor }">{{ strengthText }}</span>
          </div>
          
          <div class="password-requirements" v-if="password || registerTry">
            <div class="requirement" :class="{ met: hasMinLength }">
              <i class="fas" :class="hasMinLength ? 'fa-check' : 'fa-times'"></i>
              <span>Mindestens 8 Zeichen</span>
            </div>
            <div class="requirement" :class="{ met: hasLetter }">
              <i class="fas" :class="hasLetter ? 'fa-check' : 'fa-times'"></i>
              <span>Mindestens ein Buchstabe</span>
            </div>
            <div class="requirement" :class="{ met: hasNumber }">
              <i class="fas" :class="hasNumber ? 'fa-check' : 'fa-times'"></i>
              <span>Mindestens eine Zahl</span>
            </div>
          </div>
        </div>  

        <div class="form-group" :class="{ 'has-error': registerTry && !passwordsMatch }">
          <label>Passwort bestätigen</label>
          <div class="input-wrapper">
            <i class="fas fa-lock"></i>
            <input 
              v-model="passwordCheck"
              :type="showPasswordCheck ? 'text' : 'password'"
              placeholder="Passwort wiederholen"
              @focus="focusField('passwordCheck')"
              @blur="blurField('passwordCheck')"
            />
            <span class="toggle-password" @click="showPasswordCheck = !showPasswordCheck">
              <i class="fas" :class="showPasswordCheck ? 'fa-eye-slash' : 'fa-eye'"></i>
            </span>
          </div>
          <span class="error-message" v-if="registerTry && !passwordsMatch">Passwörter stimmen nicht überein</span>
        </div>

        <button 
          class="register-button" 
          @click="register"
          :disabled="isRegistering"
        >
          <span v-if="!isRegistering">Registrieren</span>
          <span v-else class="spinner"></span>
        </button>
        
        <p class="global-error" v-if="error" v-html="error"></p>
        
        <transition name="fade">
          <div class="success-message" v-if="registerSuccess">
            <i class="fas fa-check-circle"></i>
            <p>Sie haben sich erfolgreich registriert. Sie können sich jetzt anmelden.</p>
          </div>
        </transition>
        
        <p class="login-link">
          Bereits registriert? <router-link to="/login">Anmelden</router-link>
        </p>
      </div>
      
      <div class="register-image">
        <div class="image-content">
          <img src="../assets/registerNoBack.png" alt="Register"/>
          <h2>Willkommen bei Logivilia!</h2>
          <p>Genießen Sie eine Vielzahl an Rätseln und trainieren Sie Ihr logisches Denken.</p>
          <ul class="benefits">
            <li><i class="fas fa-check"></i> Zugang zu allen Rätseln</li>
            <li><i class="fas fa-check"></i> Speichern Ihres Fortschritts</li>
            <li><i class="fas fa-check"></i> Teilnahme an der Community</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMainStore } from '@/store/store'
import { useRouter } from 'vue-router'
import AuthenticationService from '@/services/AuthenticationService'

const store = useMainStore()
const router = useRouter()

// Form fields
const email = ref('')
const password = ref('')
const username = ref('')
const passwordCheck = ref('')
const gender = ref('Nicht angegeben')
const city = ref('Nicht angegeben')

// UI state
const error = ref(null)
const registerTry = ref(false)
const registerSuccess = ref(false)
const isRegistering = ref(false)
const showPassword = ref(false)
const showPasswordCheck = ref(false)
const focusedField = ref(null)

// Password validation
const hasMinLength = computed(() => password.value.length >= 8)
const hasLetter = computed(() => /[A-Za-z]/.test(password.value))
const hasNumber = computed(() => /\d/.test(password.value))
const isValidPassword = computed(() => hasMinLength.value && hasLetter.value && hasNumber.value)
const passwordsMatch = computed(() => password.value === passwordCheck.value && password.value !== '')
const isValidEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))

// Password strength
const passwordStrength = computed(() => {
  if (!password.value) return 0
  
  let strength = 0
  if (hasMinLength.value) strength += 30
  if (hasLetter.value) strength += 30
  if (hasNumber.value) strength += 30
  if (/[^A-Za-z0-9]/.test(password.value)) strength += 10 // Special character
  
  return Math.min(strength, 100)
})

const strengthColor = computed(() => {
  if (passwordStrength.value < 40) return '#ff4d4d'
  if (passwordStrength.value < 70) return '#ffa500'
  return '#4caf50'
})

const strengthText = computed(() => {
  if (passwordStrength.value < 40) return 'Schwach'
  if (passwordStrength.value < 70) return 'Mittel'
  return 'Stark'
})

// Form interaction
const focusField = (field) => {
  focusedField.value = field
}

const blurField = (field) => {
  if (focusedField.value === field) {
    focusedField.value = null
  }
}

// Registration
const register = async () => {
  registerTry.value = true
  
  if (!username.value || !isValidEmail.value || !isValidPassword.value || !passwordsMatch.value) {
    error.value = "Bitte korrigieren Sie die markierten Felder."
    return
  }
  
  try {
    isRegistering.value = true
    error.value = null
    
    const response = await AuthenticationService.register({
      username: username.value,
      email: email.value,
      gender: gender.value,
      city: city.value,
      password: password.value
    })
    
    store.setToken(response.data.token)
    store.setUser(response.data.user)
    registerSuccess.value = true
    
    // Redirect after successful registration
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
    
  } catch (err) {
    error.value = err.response?.data?.error || "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut."
  } finally {
    isRegistering.value = false
  }
}

// Clear error when form changes
watch([username, email, password, passwordCheck], () => {
  if (error.value) error.value = null
})

// Email validation in real-time
watch(email, (newValue) => {
  if (error.value) error.value = null
  // Real-time email validation
  if (newValue && !isValidEmail.value) {
    // Optional: You could set a specific email error here
  }
})
</script>

<style scoped>
.register-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.register-card {
  display: flex;
  width: 1000px;
  max-width: 100%;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.register-form {
  flex: 1;
  padding: 2rem; /* Reduced padding */
  padding-right: 3rem;
}

.register-image {
  flex: 1;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.image-content {
  padding: 3rem;
  text-align: center;
  z-index: 2;
}

.image-content img {
  max-width: 80%;
  margin-bottom: 2rem;
}

.image-content h2 {
  font-size: 1.8rem;
  margin-bottom: 1rem;
}

.benefits {
  list-style: none;
  padding: 0;
  margin-top: 2rem;
  text-align: left;
}

.benefits li {
  margin-bottom: 0.8rem;
  display: flex;
  align-items: center;
}

.benefits li i {
  margin-right: 10px;
  color: #4caf50;
}

.register-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #333;
}

.register-subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper i {
  position: absolute;
  left: 20px;
  color: #aaa;
  transition: color 0.3s;
}

.input-wrapper input {
  width: 100%;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s;
}

.input-wrapper input:focus {
  border-color: #6e8efb;
  box-shadow: 0 0 0 3px rgba(110, 142, 251, 0.2);
  outline: none;
}

.input-wrapper input:focus + i {
  color: #6e8efb;
}

.toggle-password {
  position: absolute;
  right: 12px;
  color: #aaa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.validation-icon {
  position: absolute;
  right: 12px;
  transition: all 0.3s;
}

.validation-icon .fa-check-circle {
  color: #4caf50;
}

.validation-icon .fa-times-circle {
  color: #f44336;
}

.has-error .input-wrapper input {
  border-color: #f44336;
}

.error-message {
  color: #f44336;
  font-size: 0.8rem;
  margin-top: 0.5rem;
  display: block;
  animation: fadeIn 0.3s;
}

.password-strength {
  margin-top: 0.8rem;
}

.strength-meter {
  height: 4px;
  background-color: #eee;
  border-radius: 2px;
  margin-bottom: 0.5rem;
}

.strength-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s, background-color 0.3s;
}

.strength-text {
  font-size: 0.8rem;
  font-weight: 500;
}

.password-requirements {
  margin-top: 0.8rem;
  font-size: 0.8rem;
  color: #666;
}

.requirement {
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
  transition: color 0.3s;
}

.requirement i {
  margin-right: 0.5rem;
  font-size: 0.7rem;
}

.requirement.met {
  color: #4caf50;
}

.requirement:not(.met) i {
  color: #f44336;
}

.register-button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 1rem;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px; /* Fixed height for button */
}

.register-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(110, 142, 251, 0.4);
}

.register-button:active {
  transform: translateY(0);
}

.register-button:disabled {
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

.global-error {
  color: #f44336;
  margin-top: 1rem;
  text-align: center;
  animation: fadeIn 0.3s;
}

.success-message {
  background-color: #e8f5e9;
  color: #2e7d32;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  display: flex;
  align-items: center;
}

.success-message i {
  font-size: 1.5rem;
  margin-right: 0.8rem;
}

.login-link {
  text-align: center;
  margin-top: 1.5rem;
  color: #666;
}

.login-link a {
  color: #6e8efb;
  text-decoration: none;
  font-weight: 500;
}

.login-link a:hover {
  text-decoration: underline;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s, transform 0.5s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Responsive */
@media (max-width: 768px) {
  .register-card {
    flex-direction: column;
  }
  
  .register-form {
    padding: 2rem;
  }
  
  .register-image {
    display: none;
  }
}
</style>
