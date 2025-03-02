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
          <span class="button-glow"></span>
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
        <div class="floating-elements">
          <div class="floating-element element1"></div>
          <div class="floating-element element2"></div>
          <div class="floating-element element3"></div>
        </div>
        <div class="image-content">
          <img src="../assets/registerNoBack.png" alt="Register" class="floating-image"/>
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
  position: relative;
  overflow: hidden;
}

/* Animated background */
.animated-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
}

.register-card {
  display: flex;
  width: 1000px;
  max-width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  position: relative;
}

.register-form {
  flex: 1;
  padding: 2rem;
  padding-right: 3rem;
  position: relative;
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

/* Floating elements in the right panel */
.floating-elements {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.floating-element {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.element1 {
  width: 100px;
  height: 100px;
  top: 10%;
  left: 10%;
  animation: float 8s ease-in-out infinite;
}

.element2 {
  width: 60px;
  height: 60px;
  bottom: 20%;
  right: 15%;
  animation: float 12s ease-in-out infinite reverse;
}

.element3 {
  width: 40px;
  height: 40px;
  top: 60%;
  left: 20%;
  animation: float 10s ease-in-out infinite 2s;
}

.image-content {
  padding: 3rem;
  text-align: center;
  z-index: 2;
  position: relative;
}

.floating-image {
  max-width: 80%;
  margin-bottom: 2rem;
  animation: floatImage 6s ease-in-out infinite;
  filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2));
}

.image-content h2 {
  font-size: 1.8rem;
  margin-bottom: 1rem;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
  transition: transform 0.3s;
}

.benefits li:hover {
  transform: translateX(5px);
}

.benefits li i {
  margin-right: 10px;
  color: #4caf50;
  background: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.register-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #333;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.register-subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
  transition: transform 0.3s;
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
  padding: 17px;
  padding-left: 45px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.8);
}

.input-wrapper input:focus {
  border-color: #6e8efb;
  box-shadow: 0 0 0 3px rgba(110, 142, 251, 0.2);
  outline: none;
  background: white;
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
  transition: color 0.3s;
}

.toggle-password:hover {
  color: #6e8efb;
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
  overflow: hidden;
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
  height: 48px;
  overflow: hidden;
}

.register-button:hover {
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
  animation: successPulse 2s infinite;
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
  transition: all 0.3s;
}

.login-link a:hover {
  text-decoration: none;
  color: #a777e3;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0); }
}

@keyframes floatImage {
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
}

@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.2; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
}

@keyframes glow {
  0% { left: -100px; }
  100% { left: 100%; }
}

@keyframes successPulse {
  0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(46, 125, 50, 0); }
  100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
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
    height: auto;
  }
  
  .register-form {
    padding: 2rem;
  }
  
  .register-image {
    display: none;
  }
}
</style>
