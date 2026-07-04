# Bun Express Books Club pgvector API — Boilerplate Design

**Date:** 2026-07-03  
**Status:** Approved

## Purpose

A reusable template/starter for a REST API built with Bun, Express, PostgreSQL (pgvector), and Drizzle ORM. Intended as a base to clone and extend — not a production service.

## Stack

- **Runtime:** Bun
- **Framework:** Express
- **Database:** PostgreSQL 16 + pgvector extension (via Docker)
- **ORM:** Drizzle ORM + drizzle-kit
- **Container:** Docker Compose

## Project Structure

```
bun-express-books-club-pgvector-api/
├── src/
│   ├── db/
│   │   ├── index.ts          # Drizzle client (connect + export db)
│   │   ├── schema.ts         # books table definition
│   │   └── seed.ts           # reads books.csv, inserts into DB
│   ├── middleware/
│   │   └── errorHandler.ts   # global Express error handler
│   ├── routes/
│   │   ├── index.ts          # mounts all routers
│   │   └── health.ts         # GET /health
│   └── server.ts             # Express app setup + listen
├── drizzle/                  # generated migrations (via drizzle-kit)
├── books.csv                 # seed data source
├── docker-compose.yml        # postgres + pgvector
├── drizzle.config.ts         # drizzle-kit config
├── .env.example              # DATABASE_URL, PORT
├── .gitignore
├── package.json
└── tsconfig.json
```

## Database

### Docker Compose

- Image: `pgvector/pgvector:pg16`
- Port: `5432` exposed to host
- Named volume for data persistence
- Init SQL: `CREATE EXTENSION IF NOT EXISTS vector` on first start

### Drizzle Schema — `books` table

| Column | Type | Nullable |
|---|---|---|
| `id` | `serial` PK | no |
| `isbn13` | `varchar(13)` | yes |
| `isbn10` | `varchar(10)` | yes |
| `title` | `text` | no |
| `subtitle` | `text` | yes |
| `authors` | `text` | yes |
| `categories` | `text` | yes |
| `thumbnail` | `text` | yes |
| `description` | `text` | yes |
| `published_year` | `integer` | yes |
| `average_rating` | `real` | yes |
| `num_pages` | `integer` | yes |
| `ratings_count` | `integer` | yes |

No `embedding` column. pgvector is installed at the DB level, ready to add vector columns later.

### Seed Script

Reads `books.csv` from project root using `Bun.file()`, parses CSV, batch-inserts via Drizzle `db.insert().values([...])`.

## API

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | `{ status: "ok", timestamp }` |
| `GET` | `/books` | Paginated list — `?page=1&limit=20` |

### Middleware Stack

1. `express.json()`
2. Routes
3. `errorHandler.ts` — `{ error: message }` + appropriate status

## Environment Variables

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booksclub
PORT=8080
```

## npm Scripts

```json
"dev":         "bun --watch src/server.ts",
"start":       "bun src/server.ts",
"db:generate": "drizzle-kit generate",
"db:migrate":  "drizzle-kit migrate",
"db:seed":     "bun src/db/seed.ts",
"db:studio":   "drizzle-kit studio"
```
