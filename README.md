# Structured Technical Q&A Platform

A structured, perspective-based technical question and answer platform built with modern TypeScript, React, Express, and PostgreSQL.

## Architecture

This project is organized as an **npm workspaces monorepo**:

- **`shared/`**: Shared TypeScript types, interfaces, Zod validation schemas, and application constants used by both frontend and backend.
- **`server/`**: Express.js REST API structured following the **Controller → Service → Repository** pattern (satisfying QA-01 MVC equivalence), Kysely query builder, structured Pino logging, and centralized error handling.
- **`client/`**: React 18 SPA bundled with Vite, TypeScript, and styled with Tailwind CSS.
- **`database/`**: Numbered SQL migrations (`database/migrations/`) and seed data.
- **`scripts/`**: Utility scripts including transactional database migration runner (`scripts/migrate.ts`).

## Prerequisites

- **Node.js**: v20+ or v24 LTS
- **npm**: v10+
- **Docker & Docker Compose** (for local PostgreSQL 16) or a local PostgreSQL instance

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Start Database
```bash
docker-compose up -d
```

### 4. Run Migrations
```bash
npm run db:migrate
```

### 5. Start Development Servers
Start backend API:
```bash
npm run dev:server
```
Start frontend client:
```bash
npm run dev:client
```

## Available Scripts

- `npm run build`: Builds all workspaces (`shared`, `server`, `client`)
- `npm run typecheck`: Runs TypeScript compiler checks across all workspaces
- `npm run test`: Runs unit and integration test suites
- `npm run lint`: Runs ESLint across TypeScript source files
- `npm run format`: Formats code with Prettier
- `npm run format:check`: Validates code formatting
- `npm run db:migrate`: Executes pending database migrations

## Verification Endpoints

- Health check: `GET http://localhost:5000/api/health`
- Frontend UI: `http://localhost:3000`
