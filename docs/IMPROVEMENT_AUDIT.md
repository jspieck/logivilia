# Logivilia – Improvement Audit

_Audit date: 2026-11-08 · Scope: `logivilia/` (Express + Sequelize backend, Vue 3 + Vite frontend)_

This audit covers security, correctness, architecture, UX and engineering practice. Part A lists the problems found and their status. Part B ranks the 15 most valuable improvements, features and architecture changes. Several of them are built around the planned **automatic solver for each puzzle type** (marked ⚙). For how to run the project and what changed on 2026-11-08, see [HANDOVER.md](HANDOVER.md).

**Status key:** ✅ fixed · ⚠️ partly fixed · ❌ open. Fixes from 2026-11-08 are deployed (2026-11-14).

**Progress on Part B (2026-11-14):** B5 mostly done (workspaces, shared types, error codes + `vue-i18n`, Oruga only, lazy routes; legacy folders outside the repo remain). B15 started: `npm test` runs 36 backend tests (verifiers over all seed puzzles, API security tests on in-memory SQLite) and GitHub Actions runs tests + build. Still open in B15: frontend/browser tests, Dependabot, GDPR items.

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
| 6 | Solutions are sent to the browser, and the browser alone decided "solved", so the leaderboard could not be trusted | `*Solve.vue`, puzzle `GET` endpoints | ⚠️ The server now verifies every solve; solutions are still sent to the client (see B3) |

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
| 21 | No e-mail verification, no account deletion or data export, although the site collects gender, birth year and city (GDPR) | ❌ See B15 |

### A4. Architecture and code quality observations

- **Triplication:** every puzzle type has its own model, controller, rating model, rating controller, frontend service and solved array. The puzzle controllers are now merged into one factory (`puzzleController.js`); ratings and services are still triplicated.
- **Very large components:** `NonogramSolve.vue` (≈1,100 lines), `LinelogSolve.vue` (≈1,070), `LogicalDisplay.vue` (≈810). They mix input handling, rendering, rule checking and API calls. Options API and Composition API are mixed.
- **Two sources of truth for solves:** `solved*` JSON arrays on `User` and the unused `UserSolved*` join tables.
- **Schema management:** `seed` uses `sync({force: true})`; the `migrations/` folder exists but is never run. Production dialect is hardcoded to `mysql`, while recent commits mention Postgres. SQLite, MySQL and Postgres drivers are all installed.
- **Two UI libraries** (Buefy and Oruga) loaded together; a single 500 kB+ JS chunk with no code splitting.
- **Dead code and files:** unused JSON copies in `frontend/src/assets` (≈160 kB `nonograms.json`), `LinelogCreate.vue` with no route, legacy sibling folders `logivilia-backend/`, `logivilia-frontend/`, `logiviliaBackend/` plus installers in the parent folder.
- **Puzzle verification compares against one stored answer** for linelogs and logicals. Puzzles with more than one valid solution would reject correct answers, and nothing checks uniqueness when a puzzle is created.
- **No tests, no CI, no linting in CI;** many `console.log` calls left in components.
- **Backend error messages are German strings** spread across controllers, which blocks an English version.
- **External image hotlinking** from `logiklab.de` (availability and licensing risk).

---

## Part B – Top 15 improvements

Ranked by value and by what unblocks what. **Type:** 🏗 architecture · ✨ feature · 🎨 UX · 🔧 engineering.

### Architecture

#### 1. 🏗 One generic Riddle model
Replace the three model/controller/rating/service sets with one `Puzzle` table (`type`, `name`, `difficulty`, `data` JSON, `UserId`) and one `Solve`, `Rating` and `Comment` model keyed by puzzle ID. A new puzzle type then needs a plugin, not ten new files.
- **Effort:** M–L, including a data migration.
- **Unlocks:** 2, 6, 7, 12.

#### 2. 🏗 Puzzle-type plugin interface, shared by frontend and backend ⚙
Each type is one module: `render`, `computeClues(solution)`, `validate(grid)`, `solve(clues)` ⚙ and `hint(state)` ⚙. A shared grid engine handles pointer input, drag-fill, zoom and undo/redo. This splits the 1,000-line solve components and gives the solver a defined place to live.
- **Effort:** L.
- **Tip:** design this together with the solver; it is the solver's API.

#### 3. 🏗 Stop sending solutions to the browser
Compute clues on the server (nonogram row/column clues, linelog numbers already exist as `information`) and send only those. Verification already happens on the server (done 2026-11-08). For nonograms, keep accepting any grid that satisfies all clues.
- **Effort:** M.
- **Result:** a leaderboard that can't be faked.

#### 4. 🏗 Clean up the database layer
- Use migrations as the only source of schema; keep `sync` out of anything but tests.
- Pick one database (Postgres) for dev and production, with a `docker-compose.yml`; remove the unused drivers.
- Move solves to a proper table, drop the `solved*` JSON arrays, and add indexes on `(UserId, PuzzleId)`.
- Make `npm run seed` refuse to run when `NODE_ENV=production`.
- **Effort:** M.

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

#### 7. ✨ Automatic difficulty rating ⚙
Rate difficulty from the solver's work: the deepest technique needed, the number of steps, and how much branching. This replaces the hand-set 1–5 values and keeps difficulty consistent across authors.
- **Effort:** S–M.

#### 8. ✨ Smart hints and mistake checking ⚙
- "Next logical step" shows one cell or deduction, with a short explanation of why it follows.
- "Check my mistakes" highlights wrong cells, optionally with a cost (e.g. no leaderboard credit).
- **Effort:** M. This is the most visible player-facing use of the solver.

#### 9. ✨ Creator studio for all three types
- There is no nonogram creator, and `LinelogCreate.vue` exists but has no route.
- Add drafts, a preview, live solver validation (6) and an Admin review step before publishing.
- Nonogram from image: upload a picture, quantise it to N colours, and use the solver to adjust it until the result is unique ⚙.
- **Effort:** M–L.

### Player features

#### 10. ✨ Autosave, resume and timer
Save progress per puzzle (localStorage for guests, server for logged-in users) and resume it. Add a timer and personal best times. The logical page already warns "unsaved puzzles are lost forever"; this removes that problem.
- **Effort:** S–M.

#### 11. ✨ Daily puzzle, streaks and achievements
- One featured puzzle per type per day, with a shared daily leaderboard.
- Streak counter and achievements (first 10x10, 50 solved, first colour nonogram, ...).
- **Effort:** M. Strongest lever for return visits.

#### 12. ✨ Better leaderboards
- Weight solves by difficulty (and optionally time), and add weekly and monthly boards next to all-time.
- Compute them in SQL from the solves table (4) instead of loading every user into memory.
- **Effort:** S–M after 4.

#### 13. 🎨 Mobile, touch and offline
- Switch to Pointer Events, add pinch-zoom and a "tap to cycle" mode for small screens, and make the layouts responsive.
- Make it a PWA (installable, offline play of puzzles already loaded).
- **Effort:** M.

#### 14. 🎨 Finding puzzles
- Filters: size, number of colours, difficulty, rating, "unsolved only", author.
- "Next unsolved puzzle" button on the success screen.
- Server-side pagination and sorting (today the overview loads every puzzle, including solutions).
- **Effort:** S–M.

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
