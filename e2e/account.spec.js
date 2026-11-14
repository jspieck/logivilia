// Account pages added for GDPR (audit B15): privacy page, verification
// banner, data export and account deletion on the own profile.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  page.on('pageerror', err => { throw err; });
});

test('privacy page is linked from the footer', async ({ page }) => {
  await page.goto('/');
  // The storage notice covers the footer until it is accepted.
  await page.getByRole('button', { name: 'Verstanden' }).click();
  await page.locator('footer').getByRole('link', { name: 'Datenschutz' }).click();
  await expect(page.getByRole('heading', { name: 'Datenschutz', exact: true })).toBeVisible();
  await expect(page.getByText('Meine Daten')).toBeVisible();
});

test('an invalid verification link says so', async ({ page }) => {
  await page.goto('/verify/0000');
  await expect(page.getByText('Der Bestätigungslink ist ungültig')).toBeVisible();
});

test('own profile: unverified banner, data download and account deletion', async ({ page, request }) => {
  const login = await request.post('/api/login', { data: { email: 'e2e@example.com', password: 'e2e-pass1' } });
  expect(login.ok()).toBeTruthy();
  const { token, user } = await login.json();
  // Log in the way the app does: the Pinia store persisted in sessionStorage.
  await page.addInitScript(state => {
    sessionStorage.setItem('logivilia-store', JSON.stringify(state));
  }, { token, user, isUserLoggedIn: true });

  await page.goto(`/user/${user.id}`);
  await expect(page.getByText('Bitte bestätigen Sie Ihre E-Mail-Adresse')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Meine Daten' })).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Daten herunterladen (JSON)' }).click();
  const file = await download;
  const exported = JSON.parse(await (await file.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString('utf8')));
  expect(exported.account.email).toBe('e2e@example.com');
  expect(exported.account.password).toBeUndefined();

  page.on('dialog', dialog => dialog.accept());
  await page.getByLabel('Passwort zur Bestätigung').fill('e2e-pass1');
  await page.getByRole('button', { name: 'Konto endgültig löschen' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Registrieren' })).toBeVisible();

  const again = await request.post('/api/login', { data: { email: 'e2e@example.com', password: 'e2e-pass1' } });
  expect(again.status()).toBe(403);
});
