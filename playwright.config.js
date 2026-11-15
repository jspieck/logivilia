// Browser smoke tests: npm run build, then npm run test:e2e.
// e2e/server.js serves the built frontend and the API on an in-memory DB.
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The app picks its language from the browser on a first visit;
    // the tests check the German texts.
    locale: 'de-DE',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node e2e/server.js',
    url: `http://localhost:${PORT}/api/`,
    reuseExistingServer: false,
    timeout: 60000
  }
});
