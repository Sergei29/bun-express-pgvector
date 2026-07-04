# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun dev              # start server with hot reload (port 8080)
bun start            # start server without hot reload

# Database
bun db:generate      # generate Drizzle migration from schema changes
bun db:migrate       # apply pending migrations
bun db:seed          # seed books table from src/db/bulk/*.csv (6,810 rows)
bun db:embed         # generate and store Ollama embeddings for all books
bun db:studio        # open Drizzle Studio UI

# Tests
bun test             # run all tests (bun built-in runner)

# Code quality
bun format:check     # check formatting with Prettier
bun type-check       # TypeScript type check (tsc --noEmit)
bun check-all        # format:check + type-check + test (mirrors pre-commit)

# Infrastructure
docker compose up -d    # start Postgres + pgvector + Ollama containers
docker compose down     # stop containers
```

## Architecture

Flat Express API with Bun as the runtime. No build step — Bun runs TypeScript directly.

```
src/
  app.ts        # Express app factory (json + router + errorHandler), no listen()
  db/
    schema.ts     # Drizzle table definitions (books + HNSW index)
    index.ts      # pg Pool + drizzle client, exported as `db`
    seed.ts       # one-shot CSV seeder — scans src/db/bulk/ for *.csv
    bulk/
      books.csv   # source data (6,810 books)
    ollama.ts     # Ollama HTTP transport: waitForOllama, getEmbedding
    embedding.ts  # embedding runner: health check, batch loop, failed-ID summary
  middleware/
    errorHandler.ts  # global Express error handler (4-arg signature)
  mocks/
    books.json    # mock book fixtures used by route tests
  routes/
    health.ts          # GET /health
    health.test.ts     # supertest tests for /health
    books.ts           # GET /books?page&limit (paginated)
    books.test.ts      # supertest tests for /books (db mocked)
    index.ts           # combines all routers into `router`
  server.ts       # imports app, calls listen()
drizzle/          # generated SQL migrations (committed)
docker/
  init.sql        # CREATE EXTENSION IF NOT EXISTS vector; (runs on first container start)
```

**Request flow:** `server.ts` → `app.ts` → `express.json()` → `router` (health + books) → `errorHandler`

**Test isolation:** `app.ts` separates app creation from `listen()`. Route tests import `app` directly via `await import("@/app")`, after `mock.module("@/db", ...)` stubs out the Drizzle client — no real database required.

**Embedding pipeline:** `bun db:embed` → `embedding.ts` calls `waitForOllama()` → batch loop fetches books with `NULL` embedding → `getEmbedding()` calls Ollama → updates `books.embedding` column → logs summary of succeeded/failed IDs.

**Provider-swap pattern:** `ollama.ts` owns all Ollama HTTP logic and exports `{ waitForOllama, getEmbedding }`. To switch LLM providers, add a new transport module with the same interface and update the import in `embedding.ts`.

## Key details

- **Database:** PostgreSQL 16 via `pgvector/pgvector:pg16` Docker image. The `books` table has an `embedding vector(768)` column and an HNSW cosine index (`books_embedding_hnsw_idx`) ready for semantic search.
- **Ollama:** Runs in Docker (`ollama/ollama:latest`, port 11434). Model: `nomic-embed-text` (768 dimensions). Pull with: `docker compose exec ollama ollama pull nomic-embed-text`
- **ORM:** Drizzle ORM with `drizzle-orm/node-postgres`. Schema lives in `src/db/schema.ts`; after any schema change run `bun db:generate` then `bun db:migrate`.
- **Environment:** Bun loads `.env` automatically. Copy `.env.example` → `.env` before first run. Embedding-specific vars: `OLLAMA_URL` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `nomic-embed-text`), `EMBEDDING_CHUNK_SIZE` (default `20`, raise to `50` with GPU).
- **Pagination:** `GET /books` defaults to `page=1, limit=20`, caps limit at 100.
- **Seed:** `bun db:seed` is not idempotent — running it twice doubles the rows. Truncate first if re-seeding: `docker compose exec db psql -U postgres -d booksclub -c "TRUNCATE books RESTART IDENTITY;"` The seeder scans `src/db/bulk/` and uses the first `.csv` file it finds.
- **Embed:** `bun db:embed` is safe to re-run — it only processes books with `NULL` embedding. Failed book IDs are printed at the end; re-run to retry them.
- **Pre-commit hook:** Husky v9 runs `prettier --check` → `tsc --noEmit` → `bun test` before every commit. All three must pass. Hook file is `.husky/pre-commit` — no shell sourcing header (removed for v9 compatibility).
- **Path aliases:** `@/*` maps to `src/*` (configured in `tsconfig.json`). All internal imports use `@/` — never relative `../` paths. Bun resolves aliases natively; no bundler plugin needed.

## Commit Policy

- NEVER run `git commit`, `git push`, or any other git write commands.
- Do NOT stage files with `git add` unless explicitly asked.
- Do NOT push any changes to remote branch
- Do NOT merge any branches
- All changes must be reviewed and committed manually by the user.
- When you finish a task, summarize what files were changed and stop — do not attempt to commit.
