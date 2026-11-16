# Structured Technical Q&A Platform

A full-stack web application where users submit technical questions, moderators curate them into topics, and the community contributes structured perspectives — with upvoting, comparison, role-based moderation, and expert fingerprinting.

---

## Features

- **Question submission & review queue** — users submit questions; moderators approve and convert them into topics
- **Structured perspectives** — multiple answers per topic, each following a template (context, approach, trade-offs)
- **Upvoting** — community voting on perspectives with self-vote prevention
- **Side-by-side comparison** — compare two perspectives on the same topic
- **Role-based access** — `user`, `moderator`, and `admin` roles with granular permissions
- **Admin panel** — manage users, topics, categories, tags, and audit logs
- **Moderation queue** — flag and review reported content, handle deletion requests
- **Expert fingerprinting** — scheduled job ranks users by domain expertise signals
- **File attachments** — upload files to perspectives (stored outside the web root)
- **Full-text search** — indexed search across topics and questions
- **Email verification & password reset** — token-based auth flows
- **Rate limiting & security headers** — Helmet, CORS allowlist, argon2 password hashing, session cookies
- **End-to-end tests** — Selenium happy-path suite covering the full user journey

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6 |
| **Backend** | Node.js, Express 4, TypeScript, Kysely (query builder) |
| **Database** | PostgreSQL 16 |
| **Shared** | `@structured-qa/shared` — Zod schemas and types shared between client and server |
| **Auth** | Cookie-based sessions, argon2 password hashing |
| **Validation** | Zod (server + client) |
| **Logging** | Pino + pino-http |
| **Testing** | Jest (unit/integration, server), Selenium (e2e) |
| **Infrastructure** | Docker Compose (PostgreSQL), npm workspaces monorepo |
| **Tooling** | ESLint, Prettier, tsx (dev server) |

---

## Folder Structure

```
.
├── client/                  # React SPA (Vite)
│   ├── src/
│   │   ├── api/             # Typed API client functions
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # AuthContext
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Route-level page components
│   │   ├── services/        # Higher-level service wrappers
│   │   └── types/           # Frontend-only TypeScript types
│   └── index.html
├── server/                  # Express API
│   └── src/
│       ├── config/          # Environment config loader
│       ├── controllers/     # Route handlers
│       ├── jobs/            # Scheduled background jobs
│       ├── middleware/      # Auth, error handling, rate limiters, logging
│       ├── repositories/    # Database access layer (Kysely)
│       ├── routes/          # Express router definitions
│       ├── services/        # Business logic
│       └── types/           # Server-only TypeScript types
├── shared/                  # @structured-qa/shared package
│   └── src/
│       ├── schemas/         # Zod schemas (shared validation)
│       ├── types/           # Shared TypeScript types
│       └── constants/       # Shared constants
├── database/
│   └── migrations/          # Numbered SQL migration files (001–013)
├── e2e/                     # Selenium end-to-end test suite
│   ├── happy_path.py        # Main test script
│   └── requirements.txt
├── scripts/
│   └── migrate.ts           # DB migration runner
├── docker-compose.yml       # PostgreSQL service
├── .env.example             # Environment variable template
└── package.json             # npm workspaces root
```

---

## Prerequisites

- **Node.js** v20+
- **npm** v10+
- **Docker & Docker Compose** (for the database) — or a local PostgreSQL 16 instance
- **Python 3.10+** and **Google Chrome** (for e2e tests only)

---

## Setup & Install

### 1. Clone the repository

```bash
git clone https://github.com/yadavharsh119/Structured-Technical-Q-A-Platform.git
cd Structured-Technical-Q-A-Platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
# Copy the template to both locations
cp .env.example .env
cp .env.example server/.env
```

Then fill in your values — see [Environment Variables](#environment-variables) below.

### 4. Start the database

```bash
docker-compose up -d
```

### 5. Run database migrations

```bash
npm run db:migrate
```

---

## Running the App

### Development

Open two terminals:

```bash
# Terminal 1 — API server (http://localhost:5000)
npm run dev:server

# Terminal 2 — React client (http://localhost:3000)
npm run dev:client
```

### Production build

```bash
npm run build
npm run start --workspace=server
```

---

## Running Tests

### Unit / Integration tests (Jest)

```bash
npm test
```

### End-to-end tests (Selenium)

Ensure the database, server, and client are all running first, then:

```bash
pip install -r e2e/requirements.txt

python e2e/happy_path.py           # headless Chrome (default)
python e2e/happy_path.py --headed  # watch the browser
```

The script prints `PASS` / `FAIL` for each step and exits non-zero on failure. Screenshots of failed steps are saved to `e2e/artifacts/`.

> **Note:** The API rate-limits auth endpoints to 20 requests per 15 minutes. A single e2e run uses 8.

---

## Environment Variables

Copy `.env.example` to `.env` (repo root) **and** `server/.env`. Both files must be kept in sync.

| Variable | Description |
|---|---|
| `PORT` | Port the API server listens on |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_URL` | URL of the frontend (used for CORS and links in emails) |
| `LOG_LEVEL` | Pino log level (`info`, `debug`, `warn`, `error`) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `SESSION_SECRET` | Random secret for session signing (min 32 chars in production) |
| `SESSION_TTL_MINUTES` | Session lifetime in minutes |
| `APP_BASE_URL` | Public base URL of the app (used in email links) |
| `COOKIE_SECURE` | Set `true` when serving over HTTPS |
| `CORS_ORIGINS` | Comma-separated list of allowed browser origins |
| `UPLOAD_DIR` | Directory for file attachment storage (outside web root) |

> **Never commit `.env` files with real credentials.** Use `.env.example` as the template — it is committed and contains no secrets.
