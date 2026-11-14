# Full Stack Puzzle Application

A modern full-stack puzzle application with Vue.js frontend and Node.js backend.

## 🚀 Features

- RESTful API built with Express.js
- Vue.js frontend with modern UI components
- Database integration with Sequelize ORM
- Secure authentication using JWT and Passport
- Email functionality with Nodemailer
- Input validation using Joi
- CORS enabled
- Logging with Morgan

## 🛠️ Technology Stack

### Backend
- Node.js
- Express.js
- Sequelize ORM (MySQL, Postgres or SQLite)
- JWT & Passport for authentication
- Bcrypt for password hashing
- Nodemailer for email services

### Frontend
- Vue 3, Vite, Pinia, Vue Router
- Oruga UI on a Bulma CSS base
- vue-i18n (German, English)
- Axios for API calls

## 📦 Installation & Setup

The repo is an **npm workspace** with three packages and one lockfile (`package-lock.json` at the root):

| Workspace | What it is |
|---|---|
| `backend/` | Express + Sequelize API (served by the root `app.js`) |
| `frontend/` | Vue 3 + Vite + Pinia, Oruga components on a Bulma CSS base, vue-i18n |
| `shared/` | API error codes and TypeScript puzzle types used by both |

Always install from the root with npm (no yarn, no per-folder installs):

```bash
npm install
```

Copy `.env.example` to `.env` and fill it in. For local work SQLite is easiest: set `DB_DIALECT=sqlite`, then seed:

```bash
npm run seed
```

Start the API (port 3000) and Vite (port 8081) together, then open http://localhost:3000:

```bash
npm run dev
```

Other root scripts: `npm run build` (frontend production build), `npm start` (serve API + built frontend), `npm run typecheck` (shared types, plus a check that every API error code has a message in every locale), `npm run lint`.

### API errors and translations

Error responses look like `{ "code": "AUTH_INVALID_CREDENTIALS" }`; the backend sends no user-facing text. Codes are listed in `shared/errorCodes.json` and sent with `sendError()` from `backend/utils/apiError.js`. The frontend translates them with `apiErrorMessage(err)` from `frontend/src/i18n`, using `de.json` and `en.json`. German is the default; the locale is read from `localStorage.locale` (`setLocale('en')` switches it).

## 📝 API Documentation

### Authentication Endpoints
- `POST /register` - Register a new user
- `POST /login` - Login user
- `POST /forgot` - Request password reset
- `POST /reset/:token` - Reset password with token

### User Endpoints
- `GET /users/:userId` - Public profile, with `stats.solved` and `stats.created` counts per puzzle type
- `PATCH /users/:userId` - Update own profile (protected)
- `GET /users/:userId/solved?type=nonogram` - IDs of the puzzles the user solved (`type` optional)

### Puzzle Endpoints (all puzzle types)
Every puzzle type uses the same routes. A puzzle arrives as one flat object: the common fields (`id`, `type`, `name`, `difficulty`, `date`, `author`, `UserId`) plus the type's public data (for example `rowClues` for a nonogram). The solution never leaves the server.
- `GET /puzzles?type=nonogram` - All puzzles of a type (or of all types), each with `avgRating` and `ratingCount`
- `GET /puzzles/:puzzleId` - One puzzle
- `GET /puzzles/legacy/:type/:legacyId` - New ID of a puzzle from the old per-type tables (`{ id }`)
- `POST /puzzles` - Create a puzzle: `{ type, name, difficulty, ...data fields }` (protected; data is checked by the type's plugin)
- `PUT /puzzles/:puzzleId` - Edit a puzzle (protected; owner or Admin)
- `POST /puzzles/:puzzleId/check` - `{ answer }` → `{ solved }`; records nothing, no login needed, rate-limited
- `POST /puzzles/:puzzleId/solve` - `{ answer }`; records a verified solve (protected; `400 SOLUTION_INCORRECT` if wrong)
- `GET` / `PUT` / `DELETE /puzzles/:puzzleId/rating` - Own rating, `{ rating: 1..5 }` (protected)

### Comments Endpoints
- `GET /puzzles/:puzzleId/comments` - Comments on a puzzle
- `POST /puzzles/:puzzleId/comments` - Post a comment (protected)
- `DELETE /comments/:commentId` - Delete own comment (protected)

### Comment Upvote Endpoints
- `GET /commentupvote` - Get user's upvoted comments (protected)
- `POST /commentupvote/:commentId` - Upvote a comment (protected)
- `DELETE /commentupvote/:commentId` - Remove upvote (protected)

### Rankings
- `GET /rankings` - Top 10 per puzzle type: `{ nonogram: [...], linelog: [...], logical: [...] }`

## 🧩 Puzzle types

Each puzzle type is a plugin in `shared/puzzles/<type>.js`, used by both backend and frontend:
`dataFields`, `checkData(data)`, `computeClues(data)` (what players see) and `validate(data, answer)`;
the planned solver adds `solve` and `hint`. The frontend registry (`frontend/src/puzzles/index.js`)
adds the board component that renders the type; boards share pointer input, zoom and undo/redo
(`frontend/src/puzzles/engine/`). All puzzles live in one `Puzzles` table (`type` + `data` JSON), with
`PuzzleRatings`, `PuzzleSolves` and `Comments` keyed by puzzle ID.

To add a puzzle type: write `shared/puzzles/<type>.js`, register it in `shared/puzzles/index.js` and in
`PUZZLE_TYPES` in `backend/puzzles.js`, and add its board to `frontend/src/puzzles/index.js`.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
