# Structured Technical Q&A Platform

A structured, perspective-based technical question and answer platform built with modern TypeScript, React, Express, and PostgreSQL.

## Architecture

This project is organized as an **npm workspaces monorepo**:

- **`shared/`**: Shared TypeScript types, interfaces, Zod validation schemas, and application constants used by both frontend and backend.
- **`server/`**: Express.js REST API structured following the **Controller → Service → Repository** pattern (satisfying QA-01 MVC equivalence), Kysely query builder, structured Pino logging, and centralized error handling.
- **`client/`**: React 18 SPA bundled with Vite, TypeScript, and styled with Tailwind CSS.
- **`database/`**: Numbered SQL migrations (`database/migrations/`); the final migration also seeds the launch categories and tags.
- **`scripts/`**: Utility scripts including the transactional database migration runner (`scripts/migrate.ts`).

## What is built

- Registration, email verification, login/logout with session cookies, and logout from all sessions
- Account recovery: password reset, resend verification, and logout from all sessions
- Asking questions, plus editing and deleting your own questions from My Questions
- Reviewer queue for approving questions and creating a topic from an approved question
- Topic list and topic pages
- Perspectives per topic, including author attribution and sorting
- Perspective upvotes with toggle support and self-vote prevention
- Side-by-side comparison of selected perspectives
- Content reporting and a moderator queue (reports, dismiss/hide/escalate)
- Expert fingerprint: top categories per user, public/private visibility, daily recalculation

## Not built yet (deferred)

- Search: date range filter, author filter, upvote-count filter
- Search: typo tolerance and autocomplete
- Search: caching
- Profile
- Admin dashboard
- Audit log viewer
- Perspective deletion requests
- Topic merge/archive
- Attachments

## Deferred

The following moderation scope is intentionally deferred:

- Moderation and report-status emails
- Multi-factor authentication (MFA)
- Branded email templates beyond plain text
- Audit log entries for moderator actions
- Automated content screening
- User warnings, suspensions and bans
- Expert fingerprint profile editing
- Expert fingerprint caching
- Configurable expert fingerprint weighting

## Prerequisites

- **Node.js**: 20 or newer (developed and verified with Node 24.18.0)
- **npm**: 10 or newer
- **Docker & Docker Compose** (for local PostgreSQL 16) or a local PostgreSQL 16 instance
- **Python 3.9+ and Chrome** only for the optional end-to-end test

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure the Environment
Copy the example environment file to the repository root and to `server/`:
```bash
cp .env.example .env
cp .env.example server/.env
```

npm workspace scripts run with `server/` as their working directory, so the API, migrations and tests read `server/.env`, while Docker Compose and the end-to-end test read the root `.env`. Keep both copies in sync.

If host port 5432 is already in use, choose another free port (for example 5433). Set `DB_PORT=5433` in both `.env` files and update `DATABASE_URL` in both files to the same port:
```dotenv
DATABASE_URL=postgres://postgres:postgrespassword@localhost:5433/structured_qa
```

### 3. Start the Database
```bash
docker-compose up -d
```

### 4. Run Migrations
```bash
npm run db:migrate
```

### 5. Start the Development Servers
Start the backend API:
```bash
npm run dev:server
```
In a second terminal, start the frontend client:
```bash
npm run dev:client
```

The client's `predev` and `prebuild` hooks build the `shared/` workspace first, so no separate shared build step is needed. Open `http://localhost:3000`; the Vite dev server proxies `/api` requests to the API on port 5000. For an automated end-to-end check, see [End-to-End Test](#end-to-end-test).

## Available Scripts

- `npm run dev:server`: Starts the API in watch mode on port 5000
- `npm run dev:client`: Starts the Vite dev server on port 3000 (after building `shared/`)
- `npm run build`: Builds all workspaces in order (`shared`, `server`, `client`)
- `npm run typecheck`: Runs TypeScript compiler checks across all workspaces
- `npm run test`: Runs all workspace test suites; the server integration suite requires a migrated database
- `npm run lint`: Runs ESLint across TypeScript source files
- `npm run format`: Formats code with Prettier
- `npm run format:check`: Validates code formatting
- `npm run db:migrate`: Executes pending database migrations

## Tests

`npm run test` runs every workspace test suite: the shared package's unit tests and the server's Jest integration suite against a real PostgreSQL database (there is no mocked or in-memory database). PostgreSQL must be running and migrated (`npm run db:migrate`) first, and the server tests read the connection from `server/.env`. The tests create uniquely named users and remove them afterwards.

## Verification Endpoints

- Health check: `GET http://localhost:5000/api/health`
- Frontend UI: `http://localhost:3000`

## End-to-End Test

`e2e/happy_path.py` is a Selenium happy path covering registration, question
review, topic creation, perspectives, upvotes and comparison against the real
client, API and PostgreSQL. It creates timestamped test users and removes them
and their content in a `finally` block.

PostgreSQL must be running and migrated, and the backend (port 5000) and client
(port 3000) must be running. Then:

```bash
python -m pip install -r e2e/requirements.txt
python e2e/happy_path.py           # headless Chrome
python e2e/happy_path.py --headed  # watch the browser
```

Defaults for `BASE_URL` and `DATABASE_URL` come from the root `.env`; both can
be overridden with environment variables. Failures stop the run and save a
screenshot to `e2e/artifacts/`. See `e2e/README.md` for details.
