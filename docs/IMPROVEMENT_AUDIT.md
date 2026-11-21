# Logivilia – Improvement Audit

_First audit: 2026-11-08 · Cleaned up: 2026-11-21 · Scope: `logivilia/` (Express + Sequelize backend, Vue 3 + Vite frontend)_

Part A lists what is still open from the first audit. Part B ranks the next improvements. Part C is a short log of what is done; the full notes for each item are in the git history of this file (before 2026-11-21). For how to run and deploy the project, see [HANDOVER.md](HANDOVER.md).

---

## Part A – Still open from the first audit

### Needs the owner (production)

| # | Item | What is left |
|---|---|---|
| A1 | Leaked SMTP password | It is in git history. Change the mailbox password, then set `SMTP_PASSWORD` in Plesk. |
| A2 | `do_not_check_in` committed | It was tracked until 2026-11-21 and is on `origin/main`. If it holds a secret, change that secret. |
| A3 | Nonogram cells outside their size | Run `npm run fix:nonograms -w backend -- --apply` on the live DB (the seed is fixed). |
| A4 | Old per-type tables | After the new version has run for a while: back up, `npm run drop:legacy -w backend`, then with `-- --apply`. |
| A5 | Not yet seen working | The MySQL CI job and real verification / reset e-mails in production. |

### Code

| # | Item | What is left |
|---|---|---|
| A8 | `npm audit` | One moderate advisory (`uuid` inside Sequelize); needs a Sequelize upgrade. |
| A9 | `LogicalDisplay.vue` | Still 1,100+ lines mixing input, rendering and checks; the other types are split into board components. |
| A10 | Solver checks block the server | `checkSolvable` runs on the request thread for up to 3 s per save. Move it to a `worker_thread`. |
| A11 | Leftover logging | 5 `console.log` calls in `frontend/src`. |

---

## Part B – Next points

Ranked by value for players and by what the work already done makes cheap. **Type:** 🏗 architecture · ✨ feature · 🎨 UX · 🔧 engineering.

#### 1. 🔧 Close the production gaps (A1–A6)
Change the SMTP password, check `do_not_check_in`, run the two live-DB scripts, and turn on CSP. Nothing else here protects real users' data as directly.
- **Effort:** S (mostly owner work), CSP S–M.

#### 2. ✨ Hints and mistake checking for logicals and linelogs ⚙
Nonograms have "Tipp" and "Prüfen". Logicals now have a solver (`shared/puzzles/logicalSolver.js`), so the same can be built for them. Linelogs need a server endpoint, because the browser has no solution.
- **Effort:** M. The most visible player-facing gain left from the solver work.
- **Good moment** to split `LogicalDisplay.vue` (A9).

#### 3. ✨ Finish the creator workflow
- An "Bearbeiten" link on your own puzzles (profile and puzzle page); today the edit pages are reachable only by URL.
- A "Meine Rätsel" list with drafts stored on the server instead of localStorage.
- An Admin review step before a new puzzle goes public (a `status` column on `Puzzles`, an Admin queue).
- **Effort:** M.

#### 4. ✨ Daily puzzle leaderboard, streaks and achievements
The daily puzzle exists. Add a daily leaderboard, a streak counter and achievements (first 10x10, 50 solved, first colour nonogram, …).
- **Effort:** M. Strongest lever for return visits.

#### 5. ✨ Better leaderboards
Weight solves by difficulty, add weekly and monthly boards, and best-time boards per puzzle (`PuzzleSolves.bestSeconds` is already stored).
- **Effort:** S–M.

#### 6. ✨ Automatic difficulty for all puzzles ⚙
The editors suggest a difficulty; the server does not. Compute it on save from the solver result and run it once over existing puzzles (a migration), so difficulty is consistent across authors.
- **Effort:** S–M. Makes 5 fairer.

#### 7. 🎨 Shareable overview filters
Keep filters and sorting in the URL, and let "next puzzle" follow the current filters instead of ID order.
- **Effort:** S.

#### 8. 🔧 Production observability
Plesk shows no Node logs. Add a log file or an error-reporting endpoint, a `/api/health` check, and a documented database backup routine.
- **Effort:** S. Makes every later deploy safer.

#### 9. 🎨 English version
Error codes and UI text already go through `vue-i18n` with `de` and `en`. Check `en.json` for gaps, translate the static pages (Impressum, Datenschutz, help texts) and the e-mails, and decide whether puzzle names get translations.
- **Effort:** S–M.

#### 10. 🏗 Dependency upkeep
Upgrade Sequelize (A8) and keep Node ≥ 22 on Plesk for `vue-i18n` 11. Small bits: logical "Raster leeren" as a full restart with the time, remove leftover `console.log`s (A11).
- **Effort:** S.

---

## Part C – Done

| Item | Date | Summary |
|---|---|---|
| Security fixes | 2026-11-08 | JWT secret from env, id-only tokens, no hashes in responses, auth and ownership on puzzle writes, no IDOR on solves, rate limits, no account enumeration, one password rule, CORS allowlist, field whitelists, root `.gitignore`. |
| Bug fixes | 2026-11-08 | Comment and rating deletes, upvote counting, ranking crash, linelog save path, rating bounds. |
| Hardening | 2026-11-14 | `helmet` (without CSP), random seed passwords, seed refuses production, separate rate-limit budgets. |
| Content Security Policy (A6) | 2026-11-21 | `helmet` CSP with an allowlist in `backend/createApp.js` (unpkg, jsdelivr, Font Awesome, same-origin images and workers); `CSP_REPORT_ONLY=1` only logs. MDI stylesheet now linked from jsdelivr (the old CDN redirects there). |
| Last hotlinked image (A7) | 2026-11-21 | The pixabay Weimar photo ships under `frontend/public/images/logicals/pixabay/` (Pixabay Content License allows self-hosting); seeds updated, migration `20261121-03` rewrites the live row. |
| One puzzle model (B1) | 2026-11-14 | `Puzzles`, `PuzzleRatings`, `PuzzleSolves`, comments by `PuzzleId`; old links redirect via `legacyId`; rankings counted in SQL. |
| Plugin interface (B2) | 2026-11-14 | `shared/puzzles/<type>.js` used by backend and frontend; one `/puzzle/:id` page; shared grid engine with Pointer Events, zoom, undo/redo. |
| No solutions in the browser (B3) | 2026-11-14 | Server sends clues, verifies every solve; public `check` endpoint. |
| Database layer (B4) | 2026-11-14 | Umzug migrations only, run on start; MySQL everywhere; `docker-compose.yml`. |
| Repo and tooling (B5) | 2026-11-21 | npm workspaces with one lockfile, Oruga only, lazy routes, shared TypeScript types, API error codes translated with `vue-i18n` (no `v-html`), legacy folders and dead assets removed. |
| Solver validation (B6) | 2026-11-15 | Nonogram, linelog and logical solvers; saves with several solutions are rejected; ambiguous seed puzzles fixed by migrations. Logical editor checks uniqueness live. |
| Difficulty suggestion (B7, partly) | 2026-11-15 | Editors suggest a difficulty from the solver (see B-6 for the rest). |
| Nonogram hints (B8, partly) | 2026-11-15 | "Tipp" with explanation and "Prüfen" (see B-2 for the rest). |
| Editors (B9, partly) | 2026-11-15 | Nonogram, linelog and logical editors with live uniqueness check, image import, test play, localStorage drafts (see B-3 for the rest). |
| Autosave, resume, timer (B10) | 2026-11-21 | Progress per puzzle, synced to the server for logged-in players; personal best times. |
| Daily puzzle (B11, partly) | 2026-11-21 | Daily puzzle on the start page (see B-4 for the rest). |
| Mobile and offline (B13) | 2026-11-21 | Pinch-zoom, tap-to-cycle, responsive layouts, PWA with offline play and queued solves. |
| Finding puzzles (B14) | 2026-11-21 | Filters, sorting and pagination in SQL; "next unsolved puzzle" (see B-7 for the rest). |
| Tests, CI, GDPR (B15) | 2026-11-14 | Backend tests (188 on 2026-11-21) and Playwright e2e; CI with lint, typecheck, SQLite and MySQL tests, build, audit; Dependabot; e-mail verification, data export, account deletion, `/datenschutz`; 52 of 53 logical images self-hosted. |
