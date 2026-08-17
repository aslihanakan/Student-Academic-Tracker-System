# Student Academic Tracker System

## Setup

```bash
npm install
cp .env.example .env
# open .env and set JWT_SECRET to a long random string
npm start   # or: node backend/server.js
```

App runs at http://localhost:5000
API docs (Swagger UI) at http://localhost:5000/api-docs

## What changed in this version

The app is now multi-user. Every account only sees its own courses,
exams, projects, study sessions and todos.

- **Register / Login screen** — the app now opens on a login/register
  form (`frontend/auth.js`). A JWT session token is stored in the
  browser and sent automatically with every API request.
- **Backend auth** — `POST /api/auth/register`, `POST /api/auth/login`,
  `GET /api/auth/me`. Passwords are hashed with bcrypt; sessions are
  signed JWTs (`backend/services/authService.js`,
  `backend/middleware/authMiddleware.js`).
- **Per-user data** — every table (`courses`, `exams`, `projects`,
  `study_sessions`, `todos`) now has a `userId` column. All routes
  except `/api/auth/*` require a valid `Authorization: Bearer <token>`
  header (enforced in `backend/server.js`).
- **Ownership checks** — creating an exam/project/study session/todo
  verifies the referenced `courseId` actually belongs to the logged-in
  user, so one account can't attach records to another account's course.
- **Fixed `todoService.js`** — `createTodo`, `updateTodoStatus` and
  `deleteTodo` were referenced by the controller but never implemented
  in the original code; they're implemented now.
- **Database migration helper** — if you point this at an older
  `academic_tracker.db` file (created before accounts existed), the
  app will add the missing `userId` columns automatically on startup.
  Existing rows will have `userId = NULL` until re-saved, so for a
  clean start it's best to delete the old `.db` file and let new
  accounts create fresh data.

## Still worth adding later

Authentication only covers "who can see what." It doesn't add rate
limiting, refresh tokens, password reset emails, or CSRF protection —
worth layering on before any real deployment.
