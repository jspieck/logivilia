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
- `GET /users/:userId` - Get user profile
- `PATCH /users/:userId` - Update user profile (protected)
- `PATCH /users/:userId/linelog/:linelogId` - Mark linelog as solved (protected)
- `PATCH /users/:userId/nonogram/:nonogramId` - Mark nonogram as solved (protected)
- `PATCH /users/:userId/logical/:logicalId` - Mark logical as solved (protected)

### Comments Endpoints
- `GET /comments/:riddleType/:riddleId` - Get comments for a riddle
- `POST /comments/:riddleType/:riddleId` - Post a comment (protected)
- `DELETE /comments` - Delete a comment (protected)

### Comment Upvote Endpoints
- `GET /commentupvote` - Get user's upvoted comments (protected)
- `POST /commentupvote/:commentId` - Upvote a comment (protected)
- `DELETE /commentupvote/:commentId` - Remove upvote (protected)

### Puzzle Endpoints
#### Logical Puzzles
- `GET /logical` - Get all logical puzzles
- `GET /logical/:logicalId` - Get specific logical puzzle
- `POST /logical` - Create new logical puzzle
- `PUT /logical/:logicalId` - Update logical puzzle

#### Nonogram Puzzles
- `GET /nonogram` - Get all nonogram puzzles
- `GET /nonogram/:nonogramId` - Get specific nonogram puzzle
- `POST /nonogram` - Create new nonogram puzzle
- `PUT /nonogram/:nonogramId` - Update nonogram puzzle

#### Linelog Puzzles
- `GET /linelog` - Get all linelog puzzles
- `GET /linelog/:linelogId` - Get specific linelog puzzle
- `POST /linelog` - Create new linelog puzzle
- `PUT /linelog/:linelogId` - Update linelog puzzle

### Rating Endpoints
#### Nonogram Ratings
- `GET /nonogramratings` - Get all ratings
- `GET /nonogramratings/:nonogramId` - Get ratings for specific puzzle (protected)
- `POST /nonogramratings` - Rate a puzzle (protected)
- `DELETE /nonogramratings` - Remove rating (protected)

#### Linelog Ratings
- `GET /linelogratings` - Get all ratings
- `GET /linelogratings/:linelogId` - Get ratings for specific puzzle (protected)
- `POST /linelogratings` - Rate a puzzle (protected)
- `DELETE /linelogratings` - Remove rating (protected)

#### Logical Ratings
- `GET /logicalratings` - Get all ratings
- `GET /logicalratings/:logicalId` - Get ratings for specific puzzle (protected)
- `POST /logicalratings` - Rate a puzzle (protected)
- `DELETE /logicalratings` - Remove rating (protected)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
