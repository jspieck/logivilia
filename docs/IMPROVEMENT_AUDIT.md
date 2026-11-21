# Logivilia – Improvement Audit

_Audit date: 2026-11-08 · Scope: `logivilia/` (Express + Sequelize backend, Vue 3 + Vite frontend)_

This audit covers security, correctness, architecture, UX and engineering practice. Part A lists the problems found and their status. Part B ranks the 15 most valuable improvements, features and architecture changes. Several of them are built around the planned **automatic solver for each puzzle type** (marked ⚙). For how to run the project and what changed on 2026-11-08, see [HANDOVER.md](HANDOVER.md).

**Status key:** ✅ fixed · ⚠️ partly fixed · ❌ open. Fixes from 2026-11-08 are deployed (2026-11-14).

**Progress on Part B (2026-11-14):** B5 mostly done (workspaces, shared types, error codes + `vue-i18n`, Oruga only, lazy routes; legacy folders outside the repo remain). B3 done: the API sends clues instead of solutions, and a public `check` endpoint answers whether a finished grid is correct. B15 started: `npm test` runs 44 backend tests (verifiers over all seed puzzles, API security tests on in-memory SQLite) and GitHub Actions runs tests + build. Still open in B15: frontend/browser tests, Dependabot, GDPR items. B1 and B2 done (2026-11-14, not yet deployed): one `Puzzles` table with `PuzzleRatings` and `PuzzleSolves`, puzzle-type plugins in `shared/puzzles` used by backend and frontend, one `/puzzle/:id` page with a board per type on a shared grid engine. B4 and B15 done (2026-11-14, not yet deployed), which completes the foundation phase: migrations are the only source of the schema and run on server start, MySQL everywhere, e-mail verification, data export, account deletion and a privacy page, Playwright smoke tests, lint/typecheck/MySQL tests/audit in CI, Dependabot. Back up the live database before deploying (HANDOVER §7). `npm test` runs 78 backend tests, `npm run test:e2e` 6 browser tests. Still open from these items: self-hosted logical puzzle images. **B6 done for nonograms (2026-11-15):** a multi-colour nonogram solver (`shared/puzzles/nonogramSolver.js`) found 4 seed nonograms with several solutions; a one-cell fix each (migration `20261115-02`) makes them unique, and saving a nonogram with several solutions is now rejected (`PUZZLE_NOT_UNIQUE`).

**Progress on 2026-11-15 (later):** B6 and B9 done for linelogs too: a linelog solver (`shared/puzzles/linelogSolver.js`) checks uniqueness by picture and is used on save and in the new linelog editor (`/linelog-create`), which turns a painted picture into numbers. The linelog board got the nonogram board's toolbar, undo/redo, timer, saved progress and full view (B2, B10). Logical images are self-hosted (B15). **Mostly open now:** everything for logicals (solver, hints, editor validation, autosave), streaks and achievements (B11), weighted and weekly leaderboards (B12), pinch-zoom and PWA (B13), filters and server-side pagination (B14), Admin review of new puzzles (B9), CSP (A3-20), and changing the leaked SMTP password (A1-1).

---

## Part A – Findings

### A1. Critical security issues

| # | Finding | Location (before fix) | Status |
|---|---|---|---|
| 1 | SMTP password hardcoded and pushed to GitHub | `backend/controllers/AuthenticationController.js:22` | ⚠️ Removed from code; **the password must be changed by the owner**, since it remains in git history |
| 2 | JWT secret fell back to `'secret'`, and `.env` did not set one, so anyone could forge a login token for any user | `backend/config/config.js:18` | ✅ |
| 3 | Login, register and reset returned the password hash and reset token; the full user record was signed into the JWT; the plain-text new password was logged on reset | `AuthenticationController.js:84-85, 161-162, 194` | ✅ |
| 4 | Anyone could create or overwrite any puzzle without logging in | `backend/routes.js:75-99` | ✅ |
| 5 | IDOR: any logged-in user could mark puzzles as solved for any other user | `backend/controllers/UserController.js:60` | ✅ |
| 6 | Solutions are sent to the browser, and the browser alone decided "solved", so the leaderboard could not be trusted | `*Solve.vue`, puzzle `GET` endpoints | ✅ The server verifies every solve, and since 2026-11-14 puzzle responses no longer contain the solution (B3) |

### A2. Functional bugs

| # | Finding | Status |
|---|---|---|
| 7 | `DELETE /comments` and the three rating deletes had no `:id` in the route, so delete could never work | ✅ |
| 8 | Comment upvote count grouped by `CommentUpvotes.id`: at most 1 upvote per row, and comments were duplicated | ✅ |
| 9 | Rankings crashed on an empty user table (`users[0]`) and load every user into memory | ⚠️ Crash fixed; still in-memory (B12) |
| 10 | `LinelogSolve.vue` had `solved = solved.value`, so one save path never ran | ✅ |
| 11 | Ratings accepted any number (e.g. 1000), which could skew averages | ✅ |
| 12 | Nine nonograms store cells outside their declared size (left over from resizing) | ⚠️ Seed data cropped (2026-11-14); live DB: run `npm run fix:nonograms -w backend -- --apply` |

### A3. Hardening

| # | Finding | Status |
|---|---|---|
| 13 | No rate limiting on login, register, forgot or reset | ✅ In-memory, per IP |
| 14 | Forgot-password revealed whether an e-mail has an account | ✅ |
| 15 | Different password rules for register (special characters allowed) and reset (letters and digits only); the register regex actually required 9+ characters | ✅ One rule: 8–32 chars, letter + digit |
| 16 | CORS reflected any origin with credentials | ✅ Restricted to `ALLOWED_ORIGINS` |
| 17 | No root `.gitignore`: `.env`, `node_modules` and SQLite files could be committed | ✅ |
| 18 | Clients could set any field on create/update (e.g. `UserId`, `id`) | ✅ Whitelists |
| 19 | Error strings containing HTML rendered with `v-html` (Login, Register, Forgot, PasswordReset) | ✅ API returns error codes, translated with `vue-i18n` |
| 20 | No security headers (CSP, HSTS, etc.) | ⚠️ `helmet` added (2026-11-14); CSP still off, needs an allowlist |
| 22 | Seed users had known plain-text passwords; `npm run seed` could wipe production | ✅ Random seed passwords; seed refuses in production without `SEED_CONFIRM=wipe-all-data` (2026-11-14) |
| 23 | Register, forgot and reset shared one rate-limit budget, so a few sign-ups blocked password resets for the same IP | ✅ Separate budgets (found by the new tests, 2026-11-14) |
| 21 | No e-mail verification, no account deletion or data export, although the site collects gender, birth year and city (GDPR) | ✅ Verification (unverified accounts cannot comment or publish), JSON export, self-service deletion, `/datenschutz` page (2026-11-14) |

### A4. Architecture and code quality observations

- **Triplication:** every puzzle type had its own model, controller, rating model, rating controller, frontend service and solved array. ✅ Replaced by one generic model and plugins (B1, B2, 2026-11-14).
- **Very large components:** `NonogramSolve.vue` (≈1,100 lines), `LinelogSolve.vue` (≈1,070), `LogicalDisplay.vue` (≈810). They mix input handling, rendering, rule checking and API calls. Options API and Composition API are mixed. ⚠️ The solve pages are now `PuzzlePage.vue` plus one board per type (B2); `LogicalDisplay.vue` is unchanged.
- **Two sources of truth for solves:** `solved*` JSON arrays on `User` and the unused `UserSolved*` join tables. ✅ Solves are rows of `PuzzleSolves` (B1); the old columns and tables are no longer read.
- **Schema management:** `seed` uses `sync({force: true})`; the `migrations/` folder exists but is never run. Production dialect is hardcoded to `mysql`, while recent commits mention Postgres. SQLite, MySQL and Postgres drivers are all installed. ✅ Migrations only, MySQL only (B4).
- **Two UI libraries** (Buefy and Oruga) loaded together; a single 500 kB+ JS chunk with no code splitting. ✅ Oruga only, lazy routes (B5).
- **Dead code and files:** unused JSON copies in `frontend/src/assets` (≈160 kB `nonograms.json`), `LinelogCreate.vue` with no route, legacy sibling folders `logivilia-backend/`, `logivilia-frontend/`, `logiviliaBackend/` plus installers in the parent folder. ⚠️ Inside the repo they are gone (no `LinelogCreate.vue`, no JSON copies in `assets`); the legacy sibling folders and installers outside `logivilia/` remain.
- **Puzzle verification compares against one stored answer** for linelogs and logicals. Puzzles with more than one valid solution would reject correct answers, and nothing checks uniqueness when a puzzle is created. ⚠️ Nonograms and linelogs are now checked on save (B6); the two ambiguous seed linelogs are fixed (migration `20261115-04`); logicals are still unchecked.
- **No tests, no CI, no linting in CI;** many `console.log` calls left in components. ✅ Tests, browser tests and CI with lint (B15); some `console.log` calls remain.
- **Backend error messages are German strings** spread across controllers, which blocks an English version. ✅ The API returns error codes, translated in the frontend (B5).
- **External image hotlinking** from `logiklab.de` (availability and licensing risk). ⚠️ 52 of 53 logical images are self-hosted under `/images/logicals/` (migration `20261115-01`); one is still hotlinked from `cdn.pixabay.com`.

---

## Part B – Top 15 improvements

Ranked by value and by what unblocks what. **Type:** 🏗 architecture · ✨ feature · 🎨 UX · 🔧 engineering.

### Architecture

#### 1. 🏗 One generic Riddle model ✅ (2026-11-14)
Replace the three model/controller/rating/service sets with one `Puzzle` table (`type`, `name`, `difficulty`, `data` JSON, `UserId`) and one `Solve`, `Rating` and `Comment` model keyed by puzzle ID. A new puzzle type then needs a plugin, not ten new files.
- **Effort:** M–L, including a data migration.
- **Unlocks:** 2, 6, 7, 12.
- **Done:** models `Puzzle` (`type`, common columns, `data` JSON, `legacyId`), `PuzzleRating`, `PuzzleSolve`; `Comment` keyed by `PuzzleId`. One API under `/api/puzzles` (list, show, create, edit, check, solve, rating, comments). Rankings and profile counts are computed in SQL from `PuzzleSolves` (part of B12). `backend/scripts/migrateToPuzzles.js` moves a live database (dry run first, old tables kept); the seed goes through the same conversion. Old links (`/nonogramSolve/12`) redirect via `legacyId`.
- **Still open:** run the migration on the live DB, then drop the old tables and columns after a while (B4). The migration is tested on SQLite only.

#### 2. 🏗 Puzzle-type plugin interface, shared by frontend and backend ⚙ ✅ (2026-11-14)
Each type is one module: `render`, `computeClues(solution)`, `validate(grid)`, `solve(clues)` ⚙ and `hint(state)` ⚙. A shared grid engine handles pointer input, drag-fill, zoom and undo/redo. This splits the 1,000-line solve components and gives the solver a defined place to live.
- **Effort:** L.
- **Tip:** design this together with the solver; it is the solver's API.
- **Done:** `shared/puzzles/<type>.js` implements `PuzzleTypePlugin` (`shared/index.d.ts`): `dataFields`, `checkData` (new: rejects broken puzzles on create/edit), `computeClues`, `validate`. The backend loads the ES modules with a dynamic `import()`; the frontend imports them via the `@shared` alias and adds the board component (`render`) in `frontend/src/puzzles/index.js`. The nonogram board checks lines with the same shared code as the server. The grid engine (`frontend/src/puzzles/engine/`) gives both grid boards Pointer Events input (mouse and touch in one path, drag continues outside the grid), zoom and undo/redo; the linelog board has undo/redo too since 2026-11-15.
- **Still open:** the plugin `solve` hook exists for nonograms only (the linelog solver is used through `checkSolvable` and the editor); `hint` as a plugin hook is not implemented (the nonogram board has its own hints, B8). Pinch-zoom and tap-to-cycle (B13) can now go into the engine once.

#### 3. 🏗 Stop sending solutions to the browser ✅ (2026-11-14)
Compute clues on the server (nonogram row/column clues, linelog numbers already exist as `information`) and send only those. Verification already happens on the server (done 2026-11-08). For nonograms, keep accepting any grid that satisfies all clues.
- **Effort:** M.
- **Result:** a leaderboard that can't be faked.
- **Done:** puzzle `GET`s go through `backend/utils/puzzleView.js` (nonograms get `rowClues`/`columnClues`, linelogs get `informationColors`). `POST /api/<type>/:id/check` lets guests check a finished grid. The logical verifier now ignores the row label column, which also makes one seed logical with mislabelled rows solvable.
- **Still open:** logicals are compared with the one stored answer, so a logical with a second valid solution rejects it; a logical solver (B6) should rule such puzzles out. (Nonograms accept any grid that fits the clues; linelogs are checked for uniqueness on save, and the seed ones are all unique or too complex to check.) The check endpoint is an oracle for complete guesses; the rate limit keeps it from being useful for brute force on real puzzle sizes.

#### 4. 🏗 Clean up the database layer ✅ (2026-11-14)
- Use migrations as the only source of schema; keep `sync` out of anything but tests.
- Pick one database (Postgres) for dev and production, with a `docker-compose.yml`; remove the unused drivers.
- Move solves to a proper table, drop the `solved*` JSON arrays, and add indexes on `(UserId, PuzzleId)`.
- Make `npm run seed` refuse to run when `NODE_ENV=production`.
- **Effort:** M.
- **Done:** Umzug runs `backend/migrations/` (`npm run migrate`, `migrate:status`); the server applies pending migrations on start (`DB_MIGRATE_ON_START=false` to opt out), since Plesk has no usable shell. The baseline migration is idempotent, so databases built by the old `sync()` adopt it; the copy into the generic tables (B1) is now a migration too. `seed` and the tests drop all tables and migrate; `test/migrations.test.js` checks every model column exists and that solves and ratings are unique per `(UserId, PuzzleId)`. **MySQL instead of Postgres**, because production already runs MySQL on netcup: `docker-compose.yml` starts MySQL 8.4, `pg`/`pg-hstore` are gone, SQLite is a dev dependency for tests only, and CI runs the backend tests on MySQL as well. `scripts/dropLegacy.js` drops the old tables and the `solved*`/`created*` columns once the new version has run for a while. `resetPasswordExpires` is BIGINT. The seed already refused production (A3-22).

#### 5. 🏗 Repo and tooling hygiene
- npm workspaces (root, backend, frontend) and one lockfile manager.
- Delete the legacy folders and dead assets.
- One UI library (keep Oruga, drop Buefy), lazy-loaded routes for code splitting.
- Consider TypeScript, at least for the shared puzzle types between frontend and backend.
- Return error **codes** from the API, translate them in the frontend with `vue-i18n`, and remove `v-html` for errors. This opens the door to an English version.
- **Effort:** M, can be done incrementally.

### Solver-powered features

#### 6. ✨ Validation in the puzzle creator ⚙
Before a puzzle is published, the solver checks that it has exactly one solution and can be solved without guessing. Run it once over all 320 existing puzzles to find broken or ambiguous ones (for example the 5 nonograms from A2-12).
- **Effort:** S once the solver exists.
- **Done (2026-11-15), nonograms:** `shared/puzzles/nonogramSolver.js` solves from the clues alone, in three stages: line logic (a forward/backward DP per row and column that handles colours: same-colour blocks need a gap, different colours may touch), contradiction (assume a colour for one cell, keep what all non-contradicting assumptions agree on; trials are undone from a trail instead of copying the grid), then a search with line logic at each node. `limit`, `maxNodes` and `maxMillis` bound the work; `complete` says whether it finished. It returns the hardest `technique` needed, which feeds B7. `npm run check:nonograms -w backend` checks the seed; `test/nonogramSolver.test.js` checks the solver against every seed solution.
- **Ambiguous seed puzzles:** "Bobby", "Mohn im Topf", "Elefant" (15x15) and "Drache" (11x14) had two solutions each. One cell each makes them unique and line-solvable (see the migration for which cell); the seed is fixed, and migration `20261115-02-unique-nonograms` applies the same change on the live DB on the next start (only to rows whose name, size and cell match and which are ambiguous before and unique after). All 181 seed nonograms now take about 0.5 s together: 168 need line logic only, 13 need contradiction.
- **Rejecting on save:** the plugin hook `checkSolvable` runs after `checkData` on `POST /puzzles` and on `PUT` when data fields change (a rename of an old puzzle still works). It returns `PUZZLE_NOT_UNIQUE` (with the number of ambiguous cells) or `PUZZLE_TOO_COMPLEX` if it can't decide within 3 s.
- **Performance:** drawn-looking 50x50 puzzles (large areas) are checked in 5–30 ms, 100x100 black-and-white in 0.2–0.5 s; 50x50 with three colours in 0.2–1.2 s. Random-noise puzzles and 70x70+ multi-colour ones with several solutions can hit the 3 s limit and are then rejected as too complex. The check runs on the request thread, so a slow save blocks the server for up to 3 s; move it to a `worker_thread` if that matters.
- **Done (2026-11-15), linelogs:** `shared/puzzles/linelogSolver.js` checks uniqueness **by picture** (players are judged by colours, not paths). It only branches where a path could stray onto a cell of another colour, which skips the many layouts that just re-pair numbers inside one colour. 82 of 85 seed linelogs were proven unique in a few ms. "Kasette" and "Leuchten" (legacy IDs 13 and 18) had a second picture; splitting one path in each (same picture, three numbers changed) makes them unique and solvable without guessing: the seed is fixed, and migration `20261115-04-unique-linelogs` applies the same change on the live DB on the next start (only to rows whose name, size and numbers match and which are ambiguous before and unique after). Seed 81 (open area, numbers up to 38) is too complex to check. `checkSolvable` returns `PUZZLE_INVALID` if the numbers cannot draw the stored picture, `PUZZLE_NOT_UNIQUE` or `PUZZLE_TOO_COMPLEX` otherwise. Tests in `backend/test/linelogEditor.test.js`.
- **Still open:** a solver for logicals (their saves are not checked for uniqueness).

#### 7. ✨ Automatic difficulty rating ⚙
Rate difficulty from the solver's work: the deepest technique needed, the number of steps, and how much branching. This replaces the hand-set 1–5 values and keeps difficulty consistent across authors.
- **Effort:** S–M.
- **Partly done:** both editors suggest a difficulty from the solver (nonogram: technique needed; linelog: size, largest number and how much guessing). Existing puzzles keep their hand-set values, and the server does not compute or check difficulty.

#### 8. ✨ Smart hints and mistake checking ⚙
- "Next logical step" shows one cell or deduction, with a short explanation of why it follows.
- "Check my mistakes" highlights wrong cells, optionally with a cost (e.g. no leaderboard credit).
- **Effort:** M. This is the most visible player-facing use of the solver.
- **Done for nonograms:** "Tipp" marks a row or column where something follows (or a cell that needs a row and a column together) and explains it; "Prüfen" marks wrong cells. Both run in the browser on the shared solver, with no leaderboard cost.
- **Still open:** linelogs (left out for now: the solution is not sent to the browser, so it would need a server endpoint) and logicals.

#### 9. ✨ Creator studio for all three types
- There is no nonogram creator, and `LinelogCreate.vue` exists but has no route.
- Add drafts, a preview, live solver validation (6) and an Admin review step before publishing.
- Nonogram from image: upload a picture, quantise it to N colours, and use the solver to adjust it until the result is unique ⚙.
- **Effort:** M–L.
- **Nonogram editor done (2026-11-15):** `/nonogram-create` (menu Nonogramm → Erstellen) and `/nonogram-create/:id` for the owner or an Admin (loads via the new `GET /puzzles/:id/source`). Tools: pen, line, rectangle, flood fill, right-click erases, undo/redo, shift, mirror, resize (centred), up to 8 colours plus background. Live clues around the canvas. The solver runs in a Web Worker (`frontend/src/puzzles/nonogram/solverWorker.js`) after each change: unique (line logic or contradiction) / ambiguous with the differing cells marked and the second solution viewable / too complex. "Korrekturen vorschlagen" lists one-cell changes that make it unique. Image import reduces a picture to 1–6 colours (k-means, border colour = background). Test play uses the real board. New puzzles are drafted in localStorage; publishing needs login, a verified e-mail and a unique puzzle. Logic in `shared/puzzles/nonogramEditor.js`, tested in `backend/test/nonogramEditor.test.js`, plus an e2e test.
- **Linelog editor done (2026-11-15):** `/linelog-create` (menu Linelog → Erstellen) and `/linelog-create/:id`. Paint or import a picture; "Zahlen erzeugen" starts with a 1 on every coloured cell and joins neighbouring paths while the puzzle stays unique (largest number configurable, "Neu würfeln" for another split). Paths can also be drawn by hand. Live uniqueness check in a Web Worker with the differing cells, the second solution and a button that splits the ambiguous paths into 1s. Editing rebuilds the paths from the stored numbers (works for all 85 seed linelogs). Test play, drafts in localStorage, e2e test.
- **Still open:** the logical creator (`LogicalCreate.vue`) has no live validation; drafts on the server; an Admin review step before publishing; an "edit" link on your own puzzles (the edit pages are only reachable by URL).

### Player features

#### 10. ✨ Autosave, resume and timer ✅
Save progress per puzzle (localStorage for guests, server for logged-in users) and resume it. Add a timer and personal best times.
- **Done (2026-11-21):** all three types save progress and time per puzzle (`frontend/src/puzzles/engine/progress.js`) and restore it, with a timer and "Gelöst in …"; logicals save grid, answer table, crossed-off clues and notepad. Logged-in players' games are mirrored to the server (`PuzzleProgresses`, `GET/PUT/DELETE /api/puzzles/:id/progress`) and continue on any device; the newer copy wins. Solving keeps the personal best time (`PuzzleSolves.bestSeconds`; guests: localStorage) and shows it under the puzzle ("Neue Bestzeit!"). The "unsaved puzzles are lost forever" warning is gone. Saved games and best times are in the data export and deleted with the account.
- **Not done:** best-time leaderboards per puzzle; the logical "Raster leeren" still clears only the grid (no full restart with the time).

#### 11. ✨ Daily puzzle, streaks and achievements
- One featured puzzle per type per day, with a shared daily leaderboard.
- Streak counter and achievements (first 10x10, 50 solved, first colour nonogram, ...).
- **Effort:** M. Strongest lever for return visits.
- **Partly done:** the start page shows a daily puzzle (the type rotates daily, difficulty ≤ 3) with how many solved it in the last 24 hours.
- **Still open:** a daily leaderboard, streaks, achievements.

#### 12. ✨ Better leaderboards
- Weight solves by difficulty (and optionally time), and add weekly and monthly boards next to all-time.
- Compute them in SQL from the solves table (4) instead of loading every user into memory.
- **Effort:** S–M after 4.
- **Partly done:** rankings are computed in SQL from `PuzzleSolves` (B1).
- **Still open:** weighting by difficulty or time, weekly and monthly boards.

#### 13. 🎨 Mobile, touch and offline
- Switch to Pointer Events, add pinch-zoom and a "tap to cycle" mode for small screens, and make the layouts responsive.
- Make it a PWA (installable, offline play of puzzles already loaded).
- **Effort:** M.
- **Partly done:** the grid boards use Pointer Events (mouse and touch in one path), fit the screen width and have a full-page view.
- **Still open:** pinch-zoom, tap-to-cycle, a responsive check of the remaining pages, PWA (no manifest or service worker).

#### 14. 🎨 Finding puzzles
- Filters: size, number of colours, difficulty, rating, "unsolved only", author.
- "Next unsolved puzzle" button on the success screen.
- Server-side pagination and sorting (today the overview loads every puzzle at once).
- **Effort:** S–M.
- **Partly done:** the overview tables have a text search and sortable columns (name, difficulty, size, colours, rating, date, solved).
- **Still open:** real filters (size range, colours, unsolved only, author), a "next unsolved puzzle" button, server-side pagination (the overview still loads every puzzle of a type).

### Engineering and trust

#### 15. 🔧 Tests, CI and compliance
- **Tests:**
  - unit tests for verifiers and the solver; running the solver over all seed puzzles makes a strong regression test
  - API tests with `supertest` (the 31 smoke checks from 2026-11-08 are a ready starting point)
  - one Playwright smoke test per puzzle type
- **CI:** GitHub Actions running lint, tests and build on every push.
- **Security:** add `helmet`, plus dependency audits (`npm audit`, Dependabot).
- **GDPR:** e-mail verification, account deletion, data export, a privacy page that lists what is stored, and self-hosted puzzle images.
- **Effort:** M overall; start with the tests that protect the solver work.
- **Done (2026-11-14):** 78 backend tests, including `account.test.js` (verification, export, deletion) and `migrations.test.js`. Playwright smoke tests (`e2e/`) solve a tiny nonogram and linelog through the UI as a guest, check the logical page, the privacy page and the profile's export and deletion; their server uses an in-memory DB and the built frontend. CI: lint, typecheck, tests on SQLite and MySQL, build + browser tests, `npm audit --omit=dev --audit-level=high`; Dependabot weekly. Dependency upgrades for the audit: `jsonwebtoken` 9, `passport` 0.7, `nodemailer` 10, `joi` 18, `vue-i18n` 11 (needs Node ≥ 22 to build). GDPR: e-mail verification (unverified accounts cannot comment or publish; existing accounts count as verified), JSON export and self-service deletion on the profile page, `/datenschutz`.
- **Still open:** one logical image still hotlinked from `cdn.pixabay.com` (52 of 53 are self-hosted since 2026-11-15); one moderate `npm audit` advisory (`uuid` inside Sequelize, no fix without a Sequelize upgrade); the MySQL CI job and real verification e-mails have not run yet.

---

## Part C – Suggested roadmap

| Phase | Items | Goal |
|---|---|---|
| 0 – now | Change the leaked SMTP password; set `JWT_SECRET` and `SMTP_PASSWORD` in production; commit the 2026-11-08 fixes | Close the open security risk |
| 1 – Foundations | 3, 4, 15 (tests for what exists) | Trustworthy data and a safety net |
| 2 – Core refactor | 1, 2, with the solver built against the plugin interface | One model, one engine, solver in place |
| 3 – Solver payoff | 6, 7, 8, 9 | Better puzzles and smarter help |
| 4 – Engagement | 10, 11, 12, 13, 14 | Retention and mobile reach |
| Ongoing | 5 | Keep the codebase small and consistent |

**Why the solver belongs in phase 2:** items 6–9 need it, and item 2 defines the interface it plugs into. Building the solver first, against the current per-type components, would mean writing it twice.
