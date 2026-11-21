// Small helpers for touch screens.

import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

/** True while the main input is a finger (phones, tablets). */
export function useTouchScreen () {
  const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(pointer: coarse)') : null
  const touch = ref(query ? query.matches : false)
  const update = () => { touch.value = query.matches }
  onMounted(() => query?.addEventListener?.('change', update))
  onBeforeUnmount(() => query?.removeEventListener?.('change', update))
  return touch
}

/** A boolean kept in localStorage (falls back to memory when blocked). */
export function useStoredFlag (key, initial = false) {
  let stored = null
  try { stored = window.localStorage.getItem(key) } catch { /* private mode */ }
  const flag = ref(stored === null ? initial : stored === '1')
  watch(flag, value => {
    try { window.localStorage.setItem(key, value ? '1' : '0') } catch { /* ignore */ }
  })
  return flag
}
