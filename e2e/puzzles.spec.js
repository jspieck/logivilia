// One smoke test per puzzle type, against e2e/server.js (fixture IDs 1-3).
// As a guest: the board renders from clues only, input works, and a correct
// answer is confirmed by the server's check endpoint.
const { test, expect } = require('@playwright/test');

// Fail on any uncaught error in the page.
test.beforeEach(async ({ page }) => {
  page.on('pageerror', err => { throw err; });
});

/** Centre of grid cell (x, y) of an SVG grid that is `cols` x `rows` cells. */
async function cellCenter (grid, cols, rows, x, y) {
  const box = await grid.boundingBox();
  // The SVG is cols * cell + 1 pixels wide (one pixel for the border line).
  const cell = (box.width - 1) / cols;
  expect(Math.abs((box.height - 1) / rows - cell)).toBeLessThan(1);
  return { x: box.x + (x + 0.5) * cell, y: box.y + (y + 0.5) * cell };
}

test('nonogram: shows clues, not the solution, and accepts a correct grid', async ({ page }) => {
  const puzzleResponse = page.waitForResponse(r => r.url().endsWith('/api/puzzles/1'));
  await page.goto('/puzzle/1');
  const puzzle = await (await puzzleResponse).json();
  expect(puzzle.solution).toBeUndefined();
  expect(puzzle.rowClues).toBeTruthy();

  await expect(page.getByRole('heading', { name: 'E2E Nonogramm' })).toBeVisible();
  const grid = page.locator('svg.main-grid');
  await expect(grid).toBeVisible();

  // Solution [[1, 0], [1, 1]]; colour 1 is selected by default.
  for (const [x, y] of [[0, 0], [0, 1], [1, 1]]) {
    const point = await cellCenter(grid, 2, 2, x, y);
    await page.mouse.click(point.x, point.y);
  }
  await expect(page.locator('.success-message')).toContainText('Gratulation! Sie haben dieses Rätsel gelöst!');

  // Success screen: on to the next nonogram (fixture 4).
  const next = page.getByRole('link', { name: 'Nächstes Rätsel' });
  await expect(next).toHaveAttribute('href', '/puzzle/4');
  await next.click();
  await expect(page.getByRole('heading', { name: 'E2E Nonogramm Gross' })).toBeVisible();
});

test('overview: filters, sorting and paging run on the server', async ({ page }) => {
  await page.goto('/nonogram-overview');
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(page.locator('.range')).toHaveText('1–2 von 2');

  // Size "11–15" keeps only the 12x12 one; the request carries the filter.
  const filtered = page.waitForResponse(r => r.url().includes('minSize=11') && r.url().includes('maxSize=15'));
  await page.getByLabel('Größe').selectOption('11-15');
  const body = await (await filtered).json();
  expect(body.total).toBe(1);
  expect(JSON.stringify(body)).not.toContain('solution');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('E2E Nonogramm Gross');

  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await expect(rows).toHaveCount(2);

  // Sorting by difficulty, descending on the second click.
  const header = page.locator('th', { hasText: 'Schwierigkeit' });
  await header.click();
  const desc = page.waitForResponse(r => r.url().includes('sort=difficulty') && r.url().includes('order=desc'));
  await header.click();
  await desc;
  await expect(rows.first()).toContainText('E2E Nonogramm Gross');
});

test('overview filters live in the URL, and "next" follows them', async ({ page }) => {
  // A shared link opens the list as it was.
  await page.goto('/nonogram-overview?difficulty=3&sort=name&order=desc');
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('E2E Nonogramm Gross');
  await expect(page.getByLabel('Schwierigkeit')).toHaveValue('3');

  // Changing a filter updates the URL; puzzle links carry filters and sort.
  await page.getByLabel('Schwierigkeit').selectOption('');
  await expect(page).toHaveURL(/\/nonogram-overview\?sort=name&order=desc$/);
  await expect(page.getByRole('link', { name: 'E2E Nonogramm', exact: true }))
    .toHaveAttribute('href', '/puzzle/1?sort=name&order=desc');

  const solve = async () => {
    const grid = page.locator('svg.main-grid');
    await expect(grid).toBeVisible();
    for (const [x, y] of [[0, 0], [0, 1], [1, 1]]) {
      const point = await cellCenter(grid, 2, 2, x, y);
      await page.mouse.click(point.x, point.y);
    }
    await expect(page.locator('.success-message')).toBeVisible();
  };

  // From that list, "next" asks with the same sort and keeps it in the link.
  const nextRequest = page.waitForRequest(r => r.url().includes('/api/puzzles/1/next') && r.url().includes('sort=name'));
  await page.getByRole('link', { name: 'E2E Nonogramm', exact: true }).click();
  await solve();
  await nextRequest;
  await expect(page.getByRole('link', { name: 'Nächstes Rätsel' })).toHaveAttribute('href', '/puzzle/4?sort=name&order=desc');

  // A filter that only this puzzle matches: no next puzzle to offer.
  await page.goto('/puzzle/1?difficulty=1');
  const nothingNext = page.waitForResponse(r => r.url().includes('/api/puzzles/1/next') && r.url().includes('minDifficulty=1'));
  await solve();
  expect((await (await nothingNext).json()).id).toBeNull();
  await expect(page.getByRole('link', { name: 'Nächstes Rätsel' })).toHaveCount(0);
});

test('linelog: drawing the path between the two numbers solves it', async ({ page }) => {
  await page.goto('/puzzle/2');
  await expect(page.getByRole('heading', { name: 'E2E Linelog' })).toBeVisible();
  const grid = page.locator('svg.main-grid');
  await expect(grid).toBeVisible();

  // Numbers 3 . 3 in one row: drag from the left number to the right one.
  const cells = [];
  for (let x = 0; x < 3; x++) cells.push(await cellCenter(grid, 3, 1, x, 0));
  await page.mouse.move(cells[0].x, cells[0].y);
  await page.mouse.down();
  for (const point of cells.slice(1)) {
    await page.mouse.move(point.x, point.y, { steps: 4 });
  }
  await page.mouse.up();
  await expect(page.locator('.success-message')).toContainText('Gratulation! Sie haben dieses Rätsel gelöst!');
});

test('logical: renders the story and asks for a complete table before checking', async ({ page }) => {
  await page.goto('/puzzle/3');
  await expect(page.getByRole('button', { name: 'Überprüfen' })).toBeVisible();
  await page.getByRole('button', { name: 'Überprüfen' }).click();
  await expect(page.getByText('Bitte zuerst alle Felder ausfüllen.')).toBeVisible();
});

test('nonogram editor: checks uniqueness live and suggests a fix', async ({ page }) => {
  await page.goto('/nonogram-create');
  await expect(page.getByRole('heading', { name: 'Nonogramm erstellen' })).toBeVisible();
  const status = page.locator('.status-line');
  await expect(status).toContainText('Noch leer');

  // The editor starts as an empty 15x15 grid.
  const grid = page.locator('svg.main-grid');
  const first = await cellCenter(grid, 15, 15, 2, 2);
  await page.mouse.click(first.x, first.y);
  await expect(status).toContainText('Eindeutig lösbar');

  // Two diagonal cells can swap: not unique.
  const second = await cellCenter(grid, 15, 15, 3, 3);
  await page.mouse.click(second.x, second.y);
  await expect(status).toContainText('Nicht eindeutig: 4 Felder');

  await page.getByRole('button', { name: 'Korrekturen vorschlagen' }).click();
  await page.getByRole('button', { name: 'Anwenden' }).first().click();
  await expect(status).toContainText('Eindeutig lösbar');
});

test('linelog editor: generates numbers, spots an ambiguous path and fixes it', async ({ page }) => {
  await page.goto('/linelog-create');
  await expect(page.getByRole('heading', { name: 'Linelog erstellen' })).toBeVisible();
  const status = page.locator('.status-line');
  await expect(status).toContainText('Noch leer');

  // Paint four cells in a row with the pen (the default tool).
  const grid = page.locator('svg.main-grid');
  const row = [];
  for (let x = 2; x <= 5; x++) row.push(await cellCenter(grid, 15, 15, x, 2));
  await page.mouse.move(row[0].x, row[0].y);
  await page.mouse.down();
  for (const point of row.slice(1)) await page.mouse.move(point.x, point.y, { steps: 3 });
  await page.mouse.up();
  await expect(status).toContainText('Eindeutig lösbar');
  await expect(page.locator('.stats')).toContainText('0 Pfade · 4 Einsen');

  await page.getByRole('button', { name: 'Zahlen erzeugen' }).last().click();
  await expect(page.locator('.stats')).toContainText('1 Pfade · 0 Einsen · größte Zahl 4');
  await expect(status).toContainText('Eindeutig lösbar');

  // An L of three cells, joined by hand: the path could also go round the
  // other side of the corner.
  for (const [x, y] of [[2, 5], [3, 5], [3, 6]]) {
    const point = await cellCenter(grid, 15, 15, x, y);
    await page.mouse.click(point.x, point.y);
  }
  await page.getByRole('radio', { name: 'Pfad' }).click();
  const corner = [];
  for (const [x, y] of [[2, 5], [3, 5], [3, 6]]) corner.push(await cellCenter(grid, 15, 15, x, y));
  await page.mouse.move(corner[0].x, corner[0].y);
  await page.mouse.down();
  for (const point of corner.slice(1)) await page.mouse.move(point.x, point.y, { steps: 3 });
  await page.mouse.up();
  await expect(status).toContainText('Nicht eindeutig: 2 Felder');

  await page.getByRole('button', { name: /mehrdeutigen Pfad/ }).click();
  await expect(status).toContainText('Eindeutig lösbar');
});
