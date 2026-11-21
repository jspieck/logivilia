// Service worker: installable app and offline play of puzzles already seen.
//
// Built by vite.config.js (pwaServiceWorker): the version and file list
// are filled in there, so every build is a new worker and the app files of
// that build are cached on install.
//
// - Pages: network first; offline the cached app shell (index.html) starts
//   the Vue app, which routes on its own.
// - /assets/* (hashed, never change): cache first.
// - Public puzzle data (GET /api/puzzles..., /api/home, /api/rankings):
//   network first, cached copy offline. Nothing user-specific is cached, and
//   the app clears this cache on logout anyway.
// - Icons and fonts from the CDNs: cached copy, refreshed in the background.

const VERSION = __VERSION__
const PRECACHE = __PRECACHE__
const APP_CACHE = `app-${VERSION}`
const API_CACHE = 'api-v1'
const CDN_CACHE = 'cdn-v1'
const SHELL = '/index.html'
const CDN_HOSTS = ['unpkg.com', 'cdn.jsdelivr.net', 'use.fontawesome.com', 'fonts.googleapis.com', 'fonts.gstatic.com']

// Public, not user-specific GET endpoints worth having offline.
const isCachedApi = (path) =>
  /^\/api\/puzzles\/?$/.test(path) ||
  /^\/api\/puzzles\/[^/]+$/.test(path) ||
  path === '/api/home' ||
  path === '/api/rankings'

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE)
    await cache.addAll([SHELL, ...PRECACHE])
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [APP_CACHE, API_CACHE, CDN_CACHE]
    for (const key of await caches.keys()) {
      if (!keep.includes(key)) await caches.delete(key)
    }
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data === 'clear-api-cache') event.waitUntil(caches.delete(API_CACHE))
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(page(request))
    } else if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
      event.respondWith(cacheFirst(request, APP_CACHE))
    } else if (isCachedApi(url.pathname)) {
      event.respondWith(networkFirst(request, API_CACHE))
    }
  } else if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, CDN_CACHE))
  }
})

async function page (request) {
  try {
    const response = await fetch(request)
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      const cache = await caches.open(APP_CACHE)
      await cache.put(SHELL, response.clone())
    }
    return response
  } catch (err) {
    const cached = await caches.match(SHELL)
    if (cached) return cached
    throw err
  }
}

async function cacheFirst (request, name) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) (await caches.open(name)).put(request, response.clone())
  return response
}

async function networkFirst (request, name) {
  const cache = await caches.open(name)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw err
  }
}

async function staleWhileRevalidate (request, name) {
  const cache = await caches.open(name)
  const cached = await cache.match(request)
  const fresh = fetch(request).then((response) => {
    if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
    return response
  }).catch(() => cached)
  return cached || fresh
}
