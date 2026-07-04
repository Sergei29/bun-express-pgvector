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
bun db:seed          # seed books table from books.csv (6,810 rows)
bun db:studio        # open Drizzle Studio UI

# Infrastructure
docker compose up -d    # start Postgres + pgvector container
docker compose down     # stop container
```

## Architecture

Flat Express API with Bun as the runtime. No build step — Bun runs TypeScript directly.

```
src/
  db/
    schema.ts     # Drizzle table definitions (books)
    index.ts      # pg Pool + drizzle client, exported as `db`
    seed.ts       # one-shot CSV seeder, run via bun db:seed
  middleware/
    errorHandler.ts  # global Express error handler (4-arg signature)
  routes/
    health.ts     # GET /health
    books.ts      # GET /books?page&limit (paginated)
    index.ts      # combines all routers into `router`
  server.ts       # Express app wiring + listen
drizzle/          # generated SQL migrations (committed)
docker/
  init.sql        # CREATE EXTENSION IF NOT EXISTS vector; (runs on first container start)
```

**Request flow:** `server.ts` → `express.json()` → `router` (health + books) → `errorHandler`

## Key details

- **Database:** PostgreSQL 16 via `pgvector/pgvector:pg16` Docker image. pgvector extension is pre-installed but no `embedding` column exists yet — it's ready to add to `schema.ts` when needed.
- **ORM:** Drizzle ORM with `drizzle-orm/node-postgres`. Schema lives in `src/db/schema.ts`; after any schema change run `bun db:generate` then `bun db:migrate`.
- **Environment:** Bun loads `.env` automatically. Copy `.env.example` → `.env` before first run.
- **Pagination:** `GET /books` defaults to `page=1, limit=20`, caps limit at 100.
- **Seed:** `bun db:seed` is not idempotent — running it twice doubles the rows. Truncate first if re-seeding: `docker compose exec db psql -U postgres -d booksclub -c "TRUNCATE books RESTART IDENTITY;"`
