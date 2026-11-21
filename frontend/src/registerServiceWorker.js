// Installs the service worker (frontend/sw.js, built to /sw.js) in
// production builds: the app becomes installable and puzzles already opened
// can be played offline. Development has none, so Vite's reload is unaffected.

export function registerServiceWorker () {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker not registered', err))
  })
}

/** Drops cached puzzle data, e.g. on logout. */
export function clearOfflineData () {
  navigator.serviceWorker?.controller?.postMessage('clear-api-cache')
}
