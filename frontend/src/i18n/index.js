import { createI18n } from 'vue-i18n'
import de from './de.json'
import en from './en.json'

export const SUPPORTED_LOCALES = ['de', 'en']
const DEFAULT_LOCALE = 'de'

function initialLocale () {
  try {
    const stored = localStorage.getItem('locale')
    if (SUPPORTED_LOCALES.includes(stored)) return stored
  } catch {
    // localStorage can be unavailable (private mode); fall back to German.
  }
  return DEFAULT_LOCALE
}

const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { de, en }
})

export function setLocale (locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem('locale', locale)
  } catch {
    // ignore
  }
}

/**
 * Turns an axios error into a translated, plain-text message.
 * The API sends `{ code, params? }` (see shared/errorCodes.json).
 * @param {unknown} err
 * @returns {string}
 */
export function apiErrorMessage (err) {
  const { t, te } = i18n.global
  const response = err && err.response
  if (!response) {
    return t('clientErrors.NETWORK')
  }
  /** @type {Partial<import('@logivilia/shared').ApiError>} */
  const data = response.data || {}
  if (data.code && te(`errors.${data.code}`)) {
    return t(`errors.${data.code}`, data.params || {})
  }
  return t('clientErrors.UNKNOWN')
}

export default i18n
