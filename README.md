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
- SQLite3 with Sequelize ORM
- JWT & Passport for authentication
- Bcrypt for password hashing
- Nodemailer for email services

### Frontend
- Vue.js
- Vue Router
- Axios for API calls

## 📦 Installation & Setup

### Backend Setup
1. Install backend dependencies
```bash
cd backend
yarn install
```

2. Set up environment variables
```bash
# Create .env file in backend directory
touch .env
```

3. Configure your .env file
```bash
PORT=3000
DB_PATH=./database.sqlite
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

4. Seed the database (optional)
```bash
yarn run seed
```

5. Start the backend server
```bash
yarn run start
```

### Frontend Setup
1. Install frontend dependencies
```bash
cd frontend
npm install
```

2. Start the frontend development server
```bash
npm run serve
```

3. Open your browser and visit `http://localhost:8080`

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

## 📦 Dependencies

### Backend Dependencies
- `sequelize`: ^5.21.11 - ORM for database operations
- `sqlite3`: ^4.2.0 - SQLite database engine
- `express`: ^4.17.1 - Web framework
- `jsonwebtoken`: ^8.5.1 - JWT authentication
- `passport`: ^0.4.1 - Authentication middleware
- `bcryptjs`: ^2.4.3 - Password hashing
- `nodemailer`: ^6.4.8 - Email functionality
- `joi`: ^14.3.1 - Input validation

### Frontend Dependencies
- `vue`: Frontend framework
- `vue-router`: Router for Vue.js
- `axios`: HTTP client for API calls

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
