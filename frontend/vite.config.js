import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

// Builds the service worker (./sw.js) into dist/sw.js with this build's file
// list and a version, so each deploy installs a new worker that caches the
// new files. Development has no service worker (see src/registerServiceWorker.js).
function pwaServiceWorker () {
  return {
    name: 'pwa-service-worker',
    apply: 'build',
    generateBundle (options, bundle) {
      const files = Object.keys(bundle).filter(name => name !== 'index.html').map(name => `/${name}`)
      const precache = [...files, '/manifest.webmanifest', '/favicon.ico', '/icons/icon-192.png', '/icons/icon.svg']
      const source = readFileSync(fileURLToPath(new URL('./sw.js', import.meta.url)), 'utf8')
        .replace('__VERSION__', JSON.stringify(Date.now().toString(36)))
        .replace('__PRECACHE__', JSON.stringify(precache))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: tag => tag.startsWith('ion-')
      }
    }
  }), pwaServiceWorker()],
  define: {
    // vue-i18n feature flags (Composition API only, no devtools in production)
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Code shared with the backend (puzzle-type plugins). An alias rather
      // than the workspace package, because some hosts' "npm install" does
      // not create the node_modules/@logivilia/shared link.
      '@shared': fileURLToPath(new URL('../shared', import.meta.url))
    }
  },
  server: {
    // app.js proxies non-API requests to this port in development.
    port: Number(process.env.VITE_PORT) || 8081,
    strictPort: true,
    host: '0.0.0.0',
  },
  preview: {
    port: process.env.PORT || 8080,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: [
      'healthcheck.railway.app',
      '.railway.app'
    ]
  }
})