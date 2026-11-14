import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: tag => tag.startsWith('ion-')
      }
    }
  })],
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