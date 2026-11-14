# Logivilia – Handover

_Last updated: 2026-11-14_

Logivilia is a German-language puzzle site with three puzzle types, user accounts, ratings, comments and leaderboards. This document is what a new developer needs to run, understand and safely change the project. For the prioritised list of what to improve next, see [IMPROVEMENT_AUDIT.md](IMPROVEMENT_AUDIT.md).

---

## 1. Action required before anything else

| What | Why | Who |
|---|---|---|
| **Change the mailbox password for `passwortreset@logivilia.com`** | It was hardcoded in `AuthenticationController.js` and is in the GitHub history (`github.com/jspieck/logivilia`). Removing it from the code does not undo the leak. | Owner (mail hosting) |
| ~~Set `SMTP_PASSWORD` and `JWT_SECRET` in production~~ | Done 2026-11-14 (netcup Plesk → Node.js → Umgebungsvariablen). | – |
| ~~Commit and deploy the security fixes~~ | Done 2026-11-14 (`37f881e`, live on logivilia.de). | – |
| Confirm password-reset e-mails arrive | The server logs `E-mail "..." accepted by <host>` or `E-mail could not be sent: ...` for every attempt (Plesk → Logs). | Owner |
| If the live DB was ever seeded: change the seed Admin's password | The old seed file contained known plain-text passwords (still in git history). | Owner |
| **Migrate the live DB before deploying the generic puzzle model** | Since 2026-11-14 the app reads puzzles, ratings and solves from `Puzzles`, `PuzzleRatings` and `PuzzleSolves`, and comments by `Comments.PuzzleId`. Without the migration every puzzle page is empty. See §7. | Owner |

**Hosting:** netcup webhosting with Plesk. Node.js app: Anwendungsstamm `/logivilia.de/httpdocs`, Startdatei `app.js`, Dokumentenstamm `/logivilia.de/httpdocs/frontend/dist`. Deploy: push → Plesk Git "Pull updates" → NPM install (if dependencies changed) → run script `build` (if `frontend/` changed) → App neu starten.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 2. Repository layout

The active project is **`F:\Logivilia\logivilia`** (git, remote `github.com/jspieck/logivilia`, branch `main`).

```
logivilia/
├── app.js                 # Single Express server: /api routes + frontend (static in prod, proxy in dev)
├── package.json           # Root scripts (install-all, build, dev, start, deploy, seed)
├── .env.example           # All environment variables, documented
├── backend/
│   ├── routes.js          # Every API route and its middleware
│   ├── config/config.js   # Env-based config (DB, JWT, mail)
│   ├── controllers/       # Request handlers
│   │   └── PuzzleController.js   # Puzzles, checks, solves and ratings for every type
│   ├── models/            # Sequelize models (loaded automatically by models/index.js)
│   ├── puzzles.js         # Loads the shared puzzle-type plugins (dynamic import)
│   ├── policies/          # Middleware: isAuthenticated, Joi validation, rateLimit
│   ├── utils/
│   │   ├── userView.js        # Which user fields may be sent (own vs. public)
│   │   ├── puzzleView.js      # Puzzle as sent to players (plugin computeClues, no solution)
│   │   └── legacyPuzzles.js   # Old per-type rows -> generic tables (seed + migration)
│   ├── scripts/           # migrateToPuzzles.js, fixNonogramSizes.js
│   ├── migrations/        # Sequelize migration files (currently NOT used by the app)
│   └── seed/              # JSON seed data + seed script (drops and recreates all tables!)
├── shared/                # Used by backend and frontend
│   ├── errorCodes.json    # API error codes
│   ├── index.d.ts         # Types, incl. the PuzzleTypePlugin interface
│   └── puzzles/           # One plugin per puzzle type: data fields, checks, clues, validation
└── frontend/              # Vue 3 + Vite + Pinia, Oruga UI (Bulma CSS), vue-i18n
    └── src/
        ├── components/    # Pages and widgets (*Overview.vue, LogicalCreate.vue, ...)
        ├── puzzles/       # PuzzlePage.vue, type registry, one board per type, engine/ (input, zoom, undo)
        ├── services/      # One axios wrapper per API resource
        ├── store/store.js # Pinia store (token + user), persisted in sessionStorage
        └── router/index.js
```

Folders **outside** the repo in `F:\Logivilia` (`logivilia-backend/`, `logivilia-frontend/`, `logiviliaBackend/`, the installers, `logivilia.sqlite`, `PasswordDatabase.txt`) are old copies or downloads. They are not used by the current app. Archive or delete them once you have checked that nothing in them is needed.

---

## 3. Running locally

**Requirements:** Node.js (v23 was used), plus a database (MySQL by default; Postgres or SQLite also work).

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `.env`. The minimum is the DB settings and `JWT_SECRET`. For quick local work SQLite is easiest: set `DB_DIALECT=sqlite`, and the database file `logivilia.db` is created in the folder you start from.

Seed the database. **Warning: this drops every table** (`sequelize.sync({force: true})`). It prints random passwords for the seed users; set `SEED_PASSWORD` to choose one instead:

```bash
npm run seed
```

Run the backend tests (in-memory SQLite, no database or mail server needed):

```bash
npm test
```

GitHub Actions (`.github/workflows/ci.yml`) runs the tests and the frontend build on every push to `main`.

Start the backend (port 3000), which proxies everything outside `/api` to the Vite dev server on port 8081:

```bash
npm run dev
```

Start the frontend dev server in a second terminal:

```bash
cd frontend && npx vite --port 8081
```

Then open `http://localhost:3000`.

**Production** (`npm run deploy`): installs everything, builds the frontend into `frontend/dist`, and `app.js` serves it statically when `NODE_ENV=production`.

### Environment variables

All variables are documented in [`.env.example`](../.env.example). The important ones:

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` serves `frontend/dist` and enforces `JWT_SECRET` |
| `DB_DIALECT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Dev defaults to MySQL. **Production is hardcoded to `mysql`** in `config.js`, although recent commits mention Postgres. Check which one Railway really uses. |
| `JWT_SECRET` | Required in production. In dev a random one is used if missing (logins are lost on restart). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Password-reset mail |
| `APP_URL` | Used in reset links, default `https://logivilia.com` |
| `ALLOWED_ORIGINS` | Comma-separated. Leave empty when the frontend is served by the same server (normal case). |

`.env` files are git-ignored; never commit them.

---

## 4. How the system works

### Puzzle types

| Type | Internal name | `data` | Checked how |
|---|---|---|---|
| Nonogram (picture logic, multi-colour) | `nonogram` | `width`, `height`, `numColor`, `colors`, `solution` (2D, 0 = empty, k = colour k) | Every row and column must match the clues of the solution |
| Linelog (number paths, Link-a-Pix style) | `linelog` | same, plus `information` (the numbers shown) | Coloured grid must equal `solution` |
| Logical (logic grid / zebra puzzle) | `logical` | `description`, `question`, `clues`, `attributes`, `solution` (table, first column = row label), `image` | Table must equal `solution` |

Seed data: 181 nonograms, 85 linelogs, 54 logicals.

**One model for all types.** Every puzzle is a row of `Puzzles`: common columns (`type`, `name`, `difficulty`, `date`, `author`, `UserId`, `legacyId`) plus a `data` JSON with the fields above. `PuzzleRatings` (one per user and puzzle), `PuzzleSolves` (verified solves, one per user and puzzle) and `Comments.PuzzleId` refer to it. `legacyId` is the puzzle's ID in the old per-type table, so old links such as `/nonogramSolve/12` still redirect to `/puzzle/<id>`.

**Puzzle-type plugins.** What differs between types lives in one module per type, `shared/puzzles/<type>.js`, which backend and frontend both import:

| Member | Used for |
|---|---|
| `dataFields` | which request fields are stored in `data` |
| `checkData(data)` | rejecting incomplete or broken puzzles on create/edit (`400 PUZZLE_INVALID`) |
| `computeClues(data)` | what players get instead of the solution (e.g. nonogram `rowClues`/`columnClues`) |
| `validate(data, answer)` | whether an answer is correct (check and solve endpoints) |
| `solve`, `hint` | planned for the solver (audit B6/B8); declared in `shared/index.d.ts`, not implemented yet |

The frontend registry (`frontend/src/puzzles/index.js`) adds each type's board component. `PuzzlePage.vue` loads a puzzle, renders its board, and handles what every type shares (recording the solve, rating, "already solved", comments). Boards get the puzzle and a `submit(answer)` function and emit `solved`; the grid boards share pointer input (Pointer Events, so mouse and touch use one path), zoom and undo/redo from `frontend/src/puzzles/engine/`.

The backend is CommonJS and the plugins are ES modules, so `backend/puzzles.js` loads them with a dynamic `import()`; `createApp` holds `/api` requests until they are loaded (only right after start). Scripts and tests `await require('./puzzles').ready`.

### Grid encoding (important when touching solve code)

The **stored** encoding is `0 = empty, k = colour k`, drawn with `colors[k - 1]`; the last entry of `colors` is the background. The boards use a different **UI** encoding: colour index `k - 1`, plus a background index and, for nonograms, a "marked empty" dot index. Each board has an `answer()` helper that converts the UI grid back to the stored encoding before it is submitted. If you change how a board stores its grid, update that helper as well.

### Authentication

- `POST /api/login` and `/api/register` return `{ user, token }`.
- The token is a JWT containing only `{ id }` and is valid for 7 days. Passport loads the user from the DB on every request (`backend/passport.js`).
- The frontend keeps the token in Pinia and persists it in `sessionStorage`. `services/Api.js` adds it as a `Bearer` header.
- Roles: `Mitglied` (default) and `Admin`. An Admin may edit any puzzle.
- User objects leave the server only through `utils/userView.js`: `ownUser` includes the e-mail, `publicUser` does not. Neither ever includes the password hash or reset fields.

### Solving flow

1. `/puzzle/:id` loads the puzzle **without its solution** (`GET /api/puzzles/:id`). `utils/puzzleView.js` sends the common columns plus the plugin's `computeClues(data)`.
2. The board decides when the player is done: nonograms when every line matches its clues (with the same shared `lineMatches` the server uses), linelogs when every number is connected by a path of the right length, logicals when the player clicks "Überprüfen" with every field filled.
3. Logged-in players who have not solved it yet then call `POST /api/puzzles/:id/solve` with `{ answer }`. The server checks it with the plugin's `validate` and adds a `PuzzleSolves` row. A wrong answer gets `400 SOLUTION_INCORRECT`.
4. Guests, and players who solved the puzzle before, call `POST /api/puzzles/:id/check` with the same body instead. It answers `{ solved: true | false }`, records nothing, needs no login, and is limited to 30 requests per minute per IP.

### API overview

All routes are in [`backend/routes.js`](../backend/routes.js), under the `/api` prefix.

| Area | Routes | Auth |
|---|---|---|
| Auth | `POST /register`, `/login`, `/forgot`, `/reset/:token` | none; rate-limited |
| Users | `GET /users/:id` (public, with solve/create counts), `PATCH /users/:id` (own profile), `GET /users/:id/solved?type=` | PATCH: login, own user only |
| Puzzles | `GET /puzzles?type=`, `GET /puzzles/:id`, `GET /puzzles/legacy/:type/:legacyId`, `POST /puzzles`, `PUT /puzzles/:id` | POST/PUT: login, PUT: owner or Admin |
| Answers | `POST /puzzles/:id/check` (anyone, rate-limited), `POST /puzzles/:id/solve` (login, verified) | see left |
| Ratings | `GET` / `PUT` / `DELETE /puzzles/:id/rating` | login; rating 1–5 |
| Comments | `GET /puzzles/:id/comments`, `POST /puzzles/:id/comments`, `DELETE /comments/:commentId` | POST/DELETE: login, delete own only |
| Upvotes | `GET /commentupvote`, `POST` / `DELETE /commentupvote/:commentId` | login |
| Rankings | `GET /rankings` (top 10 per type, counted in SQL from `PuzzleSolves`) | none |

Rate limits (in memory, per IP, 15-minute window): login 10, register / forgot / reset 5 each. They reset when the server restarts and are not shared between multiple server instances.

---

## 5. Change log: security fixes of 2026-11-08 (uncommitted)

| Area | Change | Files |
|---|---|---|
| Secrets | SMTP settings and JWT secret come from env; no `'secret'` fallback; production refuses to start without a strong secret | `config/config.js`, `controllers/AuthenticationController.js` |
| Auth responses | No password hash or reset token in any response; JWT payload is `{ id }` only; no logging of user objects or passwords | `AuthenticationController.js`, `utils/userView.js` |
| Register | Field whitelist, returns `{ user, token }` (auto-login, as the frontend expected) | `AuthenticationController.js`, `policies/AuthenticationControllerPolicy.js` |
| Password reset | Tokens stored as SHA-256 hash and cleared after use; returns `{ user, token }` | `AuthenticationController.js` |
| Forgot password | Same response whether or not the e-mail exists | `AuthenticationController.js`, `frontend/.../Forgot.vue` |
| Password rule | One rule for register and reset: 8–32 chars, ≥ 1 letter, ≥ 1 digit | `AuthenticationControllerPolicy.js` |
| Puzzle CRUD | Login required; edit only by owner or Admin; field whitelist; 404 for unknown IDs; three controllers merged into one factory | `controllers/puzzleController.js`, `*Controller.js`, `routes.js` |
| Solves | Own user only (IDOR fix); server verifies the submitted grid | `controllers/UserController.js`, `utils/verifySolution.js`, the three `*Solve.vue`, `LogicalDisplay.vue`, `services/UserService.js` |
| Comments | Delete route has `:commentId`; upvote count fixed (was at most 1 per row, with duplicate rows); field whitelist and length limit | `CommentController.js`, `routes.js`, `services/CommentService.js` |
| Ratings | Delete routes have an ID; rating must be an integer from 1 to 5 | `*RatingController.js`, `routes.js` |
| Rankings | No crash on an empty user table | `RankingController.js` |
| Linelog | Removed `solved = solved.value`, which made one save path dead code | `LinelogSolve.vue` |
| Server | Rate limiting, `trust proxy`, 1 MB body limit, CORS restricted to `ALLOWED_ORIGINS`, `x-powered-by` off | `app.js`, `policies/rateLimit.js` |
| Repo | Root `.gitignore` (`.env`, `node_modules`, `*.sqlite`, `*.db`), `.env.example` | root |

**Verified:** 31 API smoke checks against a freshly seeded SQLite DB (auth, forged tokens, IDOR, puzzle ownership, solve verification for all three types, comments, upvotes, ratings, rate limiting). The grid conversion was round-tripped for all 181 nonograms and 85 linelogs, and the frontend production build succeeds.
**Not verified:** clicking through the solve pages in a browser, real e-mail sending, and the production database (MySQL vs. Postgres).

**Behaviour changes users will notice:** register and reset log the user in straight away, and the forgot-password confirmation is worded neutrally.

---

## 6. Known issues and gotchas

- **Nonograms with stale cells:** 9 nonograms stored cells outside their declared `width × height` (left over from resizing in the editor). The seed file is fixed. The live database may still contain them; it makes no difference to players (the server ignores those cells when it computes clues and checks solves), but cropping keeps the data clean: `npm run fix:nonograms -w backend` (dry run), then with `-- --apply`. It needs the production DB settings in its environment.
- **`npm run seed` wipes the database.** In production it refuses unless `SEED_CONFIRM=wipe-all-data` is set. Seed users get random passwords, printed once.
- **Plesk's "Node.js-Befehle ausführen" tab does not get the Umgebungsvariablen:** commands run there see `NODE_ENV` unset and no DB settings. Don't judge the live configuration from that tab, and don't run `seed` or `fix:nonograms` there.
- **Old tables after the migration:** `Nonograms`, `Linelogs`, `Logicals`, the three `*Ratings` tables, the unused `UserSolved*` join tables, the `solved*`/`created*` columns on `Users` and `riddleType`/`riddleId` on `Comments` are no longer read. The migration leaves them in place; drop them by hand once the new version has run for a while.
- **Linelogs and logicals with two valid solutions** are rejected when a player finds the other one: their `validate` compares with the one stored solution. The solver (audit B6) should rule such puzzles out.
- **The migrations folder is unused;** the schema comes from Sequelize models via `sync`.
- **Production dialect** is hardcoded to `mysql` in `config.js`.
- **No Content-Security-Policy yet:** `helmet` sets the other security headers; CSP needs an allowlist for the icon/font CDNs and puzzle image hosts.
- **There is no nonogram or linelog creator.** `POST /api/puzzles` accepts every type, so a creator only needs a page.
- **Logical puzzle images** are hotlinked from `logiklab.de`.
- **Tests cover the backend only** (`npm test`: verifiers over all seed puzzles plus API tests on in-memory SQLite). No frontend or browser tests yet.

---

## 7. Migrating to the generic puzzle model

The 2026-11-14 version stores puzzles in `Puzzles` instead of `Nonograms` / `Linelogs` / `Logicals`. A live database needs a one-time migration **before** the new version starts serving. `scripts/migrateToPuzzles.js` creates the new tables, adds `Comments.PuzzleId`, and copies puzzles (keeping the old ID as `legacyId`), ratings (one per user and puzzle; invalid ones skipped), solves (from the `solved*` arrays) and comment links. It leaves the old tables untouched, runs the data copy in one transaction, and refuses to run twice.

1. Back up the database.
2. With the production DB settings in the environment (not Plesk's "Node.js-Befehle" tab, see §6), run the dry run. It lists counts and any puzzles whose data looks broken (they are copied anyway):
   ```bash
   npm run migrate:puzzles -w backend
   ```
3. Apply it:
   ```bash
   npm run migrate:puzzles -w backend -- --apply
   ```
4. Deploy the new version (pull, build, restart).

Rolling back means deploying the previous version: it still reads the old tables, but solves, ratings and comments made after the migration are not in them.

`npm run seed` builds the new schema directly from the seed files, using the same conversion (`utils/legacyPuzzles.js`). `test/migrateToPuzzles.test.js` runs the migration against an old-schema SQLite database; it has not been run against MySQL.

## 8. Where to go next

See [IMPROVEMENT_AUDIT.md](IMPROVEMENT_AUDIT.md). In short: clean up the database layer, then build the generic puzzle model together with the planned **automatic solver**, which can then power uniqueness checks, difficulty rating and hints.
