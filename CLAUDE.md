# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the **repo root** unless noted.

```bash
# Development (root)
bun run dev              # start backend + frontend concurrently
bun run dev:backend      # start backend only (port 8080, also starts Docker)
bun run dev:frontend     # start frontend only (port 5173)

# Backend-specific (run from backend/ or prefix with cd backend &&)
bun run db:generate      # generate Drizzle migration from schema changes
bun run db:migrate       # apply pending migrations
bun run db:seed          # seed books table from backend/src/db/bulk/*.csv (6,810 rows)
bun run db:embed         # generate and store Ollama embeddings for all books
bun run db:studio        # open Drizzle Studio UI
bun test                 # run all backend tests (bun built-in runner)

# Code quality
bun run check-all        # run checks across both workspaces (mirrors pre-commit)
# Individual workspace checks:
cd backend && bun run check-all   # prettier + tsc + tests
cd frontend && bun run check-all  # prettier + tsc

# Infrastructure
docker compose up -d    # start Postgres + pgvector + Ollama + Redis containers
docker compose down     # stop containers
```

## Architecture

Bun workspace monorepo with two packages: `backend/` (Express API) and `frontend/` (React+Vite SPA).

```
backend/
  src/
    app.ts        # Express app factory (cors + json + router + errorHandler), no listen()
    db/
      schema.ts     # Drizzle table definitions (books + HNSW index)
      index.ts      # pg Pool + drizzle client, exported as `db`
      seed.ts       # one-shot CSV seeder — scans src/db/bulk/ for *.csv
      bulk/
        books.csv   # source data (6,810 books)
      ollama.ts     # Ollama HTTP transport: waitForOllama, getEmbedding
      embedding.ts  # embedding runner: health check, batch loop, failed-ID summary
    lib/
      validation.ts # Zod schemas: createBookInputSchema, updateBookInputSchema
    middleware/
      errorHandler.ts  # global Express error handler (4-arg signature)
    mocks/
      books.json    # mock book fixtures used by route tests
    queues/
      embedding.ts     # Bull queue for embedding jobs: processor, retry, event logging
    routes/
      health.ts          # GET /health
      health.test.ts     # supertest tests for /health
      books.ts           # CRUD + semantic search routes (/api/books/*)
      books.test.ts      # supertest tests for GET /api/books (db mocked)
      books-write.test.ts # supertest tests for POST/PUT/DELETE/search
      index.ts           # combines all routers into `router`
    test-helpers/
      db-mock.ts    # shared Drizzle mock factory for route tests
    server.ts       # imports app, calls listen()
  drizzle/          # generated SQL migrations (committed)
  .prettierignore   # excludes drizzle/meta from formatting checks

frontend/
  src/
    App.tsx         # root React component
    main.tsx        # React entry point
    index.css       # Tailwind @tailwind base/components/utilities
  index.html
  vite.config.ts    # proxies /api → http://localhost:8080
  tailwind.config.js
  postcss.config.js

docker/
  init.sql          # CREATE EXTENSION IF NOT EXISTS vector; (runs on first container start)
```

**Request flow:** `backend/src/server.ts` → `app.ts` → `cors()` → `express.json()` → `router` (health + books) → `errorHandler`

**Frontend proxy:** Vite dev server proxies `/api/*` → `http://localhost:8080` so `fetch('/api/books')` works without hardcoded URLs or CORS issues in development.

**Test isolation:** `app.ts` separates app creation from `listen()`. Route tests import `app` directly via `await import("@/app")`, after `mock.module("@/db", ...)` stubs out the Drizzle client — no real database required.

**Embedding job queue:** `POST /api/books` and `PUT /api/books/:id` (on semantic field change) add jobs to the Bull queue (`backend/src/queues/embedding.ts`). Queue uses Redis backend with 3-attempt retry (exponential backoff). Server initializes queue processor on startup via `server.ts`. Job processor calls `generateEmbeddingAsync()` which updates the book's embedding column. Jobs are logged by status (queued, processing, completed, failed).

**Batch embedding pipeline:** `bun db:embed` → `embedding.ts` calls `waitForOllama()` → batch loop fetches books with `NULL` embedding → `getEmbedding()` calls Ollama → updates `books.embedding` column → logs summary of succeeded/failed IDs. This is separate from the job queue and runs as a standalone script.

**Provider-swap pattern:** `ollama.ts` owns all Ollama HTTP logic and exports `{ waitForOllama, getEmbedding }`. To switch LLM providers, add a new transport module with the same interface and update the import in `embedding.ts`.

## Key details

- **Workspaces:** Bun manages a single root `bun.lock` covering both `backend/` and `frontend/`. Run `bun install` from the repo root to install all dependencies.
- **Database:** PostgreSQL 16 via `pgvector/pgvector:pg16` Docker image. The `books` table has an `embedding vector(768)` column and an HNSW cosine index (`books_embedding_hnsw_idx`) ready for semantic search.
- **Ollama:** Runs in Docker (`ollama/ollama:latest`, port 11434). Model: `nomic-embed-text` (768 dimensions). Pull with: `docker compose exec ollama ollama pull nomic-embed-text`
- **Redis & Bull Queue:** Redis runs in Docker (port 6379) as the backend for Bull job queue. Embedding tasks from `POST /api/books` and `PUT /api/books/:id` are queued with 3-attempt retry and exponential backoff. Configured via `REDIS_URL` env var (default `redis://localhost:6379`). Queue processor starts automatically when server runs (`backend/src/server.ts` imports queue module). Job events logged to console (queued, processing, completed, failed, stalled).
- **ORM:** Drizzle ORM with `drizzle-orm/node-postgres`. Schema lives in `backend/src/db/schema.ts`; after any schema change run `bun run db:generate` then `bun run db:migrate` from `backend/`.
- **CORS:** Backend allows `http://localhost:5173` (Vite dev server). Configured in `backend/src/app.ts` via the `cors` package.
- **Environment:** Bun loads `.env` automatically. Copy `backend/.env.example` → `backend/.env` before first run. Key vars: `DATABASE_URL`, `REDIS_URL` (default `redis://localhost:6379`), `OLLAMA_URL` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `nomic-embed-text`), `EMBEDDING_CHUNK_SIZE` (default `20`, raise to `50` with GPU).
- **Pagination:** `GET /api/books` defaults to `page=1, limit=20`, caps limit at 100.
- **Seed:** `bun db:seed` is not idempotent — running it twice doubles the rows. Truncate first if re-seeding: `docker compose exec db psql -U postgres -d booksclub -c "TRUNCATE books RESTART IDENTITY;"` The seeder scans `backend/src/db/bulk/` and uses the first `.csv` file it finds.
- **Embed:** `bun db:embed` is safe to re-run — it only processes books with `NULL` embedding. Failed book IDs are printed at the end; re-run to retry them.
- **Pre-commit hook:** Husky v9 runs backend (prettier → tsc → tests) then frontend (prettier → tsc) before every commit. Hook is `.husky/pre-commit` — delegates per-workspace using `cd backend && ...` / `cd frontend && ...`.
- **Path aliases:** `@/*` maps to `src/*` in `backend/tsconfig.json`. All backend imports use `@/` — never relative `../` paths. Bun resolves aliases natively; no bundler plugin needed.
- **Tailwind:** Frontend uses Tailwind CSS v3 with PostCSS. Config at `frontend/tailwind.config.js`. Content paths: `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`.

## Commit Policy

- NEVER run `git commit`, `git push`, or any other git write commands.
- Do NOT stage files with `git add` unless explicitly asked.
- Do NOT push any changes to remote branch
- Do NOT merge any branches
- All changes must be reviewed and committed manually by the user.
- When you finish a task, summarize what files were changed and stop — do not attempt to commit.
