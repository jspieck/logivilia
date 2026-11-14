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
