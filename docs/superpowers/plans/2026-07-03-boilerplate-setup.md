# Bun Express Books Club API — Boilerplate Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a working Bun + Express + Drizzle ORM + pgvector (Docker) template API, seeded with books from `books.csv`.

**Architecture:** Flat `src/` layout — `db/`, `middleware/`, `routes/`, `server.ts`. Drizzle manages schema and migrations. Docker Compose runs Postgres with pgvector extension pre-installed. A one-shot seed script reads `books.csv` and batch-inserts all rows.

**Tech Stack:** Bun, Express 4, Drizzle ORM + drizzle-kit, node-postgres (`pg`), papaparse, Docker Compose, TypeScript.

## Global Constraints

- Runtime: Bun (not Node). Run all scripts with `bun`, not `node` or `ts-node`.
- Port: `8080`
- Database: `postgresql://postgres:postgres@localhost:5432/booksclub`
- No `embedding` column — pgvector extension is installed at DB level only, for future use.
- No commits — skip all `git commit` steps.
- `books.csv` is already present at project root.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Produces: `bun install` resolves deps; `bun run dev` / `bun db:*` scripts are available.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "bun-express-books-club-pgvector-api",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/server.ts",
    "start": "bun src/server.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "bun src/db/seed.ts",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "express": "^4.21.2",
    "drizzle-orm": "^0.44.2",
    "pg": "^8.13.1",
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/pg": "^8.11.10",
    "@types/papaparse": "^5.3.14",
    "drizzle-kit": "^0.31.1",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "drizzle.config.ts"]
}
```

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booksclub
PORT=8080
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
.env
dist/
```

- [ ] **Step 5: Install dependencies**

```bash
bun install
```

Expected: `node_modules/` created, `bun.lockb` written, no errors.

---

### Task 2: Docker Compose + pgvector

**Files:**
- Create: `docker-compose.yml`
- Create: `docker/init.sql`

**Interfaces:**
- Produces: a running Postgres 16 instance at `localhost:5432` with the `vector` extension available in the `booksclub` database.

- [ ] **Step 1: Create `docker/init.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: booksclub
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  pgdata:
```

- [ ] **Step 3: Start the container**

```bash
docker compose up -d
```

Expected: container `db` starts. May take 10–20 seconds on first pull.

- [ ] **Step 4: Verify pgvector extension is available**

```bash
docker compose exec db psql -U postgres -d booksclub -c "\dx"
```

Expected output includes a row with `vector` in the Name column.

---

### Task 3: Drizzle Config, Schema & DB Connection

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `.env` (copy from `.env.example`)

**Interfaces:**
- Produces: `export const books` table definition from `src/db/schema.ts`; `export const db` Drizzle client from `src/db/index.ts`.
- Later tasks import: `import { db } from "../db/index"` and `import { books } from "../db/schema"`.

- [ ] **Step 1: Copy `.env.example` to `.env`**

```bash
cp .env.example .env
```

- [ ] **Step 2: Create `drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3: Create `src/db/schema.ts`**

```typescript
import { pgTable, serial, text, varchar, integer, real } from "drizzle-orm/pg-core";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  isbn13: varchar("isbn13", { length: 13 }),
  isbn10: varchar("isbn10", { length: 10 }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  authors: text("authors"),
  categories: text("categories"),
  thumbnail: text("thumbnail"),
  description: text("description"),
  published_year: integer("published_year"),
  average_rating: real("average_rating"),
  num_pages: integer("num_pages"),
  ratings_count: integer("ratings_count"),
});
```

- [ ] **Step 4: Create `src/db/index.ts`**

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
```

- [ ] **Step 5: Generate migration**

```bash
bun db:generate
```

Expected: `drizzle/` directory created with a `.sql` migration file containing `CREATE TABLE "books" (...)`.

- [ ] **Step 6: Run migration**

```bash
bun db:migrate
```

Expected: `All migrations applied` (or similar). No errors.

- [ ] **Step 7: Verify table exists**

```bash
docker compose exec db psql -U postgres -d booksclub -c "\dt"
```

Expected: `books` table listed.

---

### Task 4: Seed Script

**Files:**
- Create: `src/db/seed.ts`

**Interfaces:**
- Consumes: `db` from `src/db/index.ts`, `books` from `src/db/schema.ts`, `books.csv` at project root.
- Produces: all CSV rows inserted into the `books` table.

- [ ] **Step 1: Create `src/db/seed.ts`**

```typescript
import { db } from "./index";
import { books } from "./schema";
import Papa from "papaparse";

const file = Bun.file("books.csv");
const text = await file.text();

const { data } = Papa.parse<Record<string, string>>(text, {
  header: true,
  skipEmptyLines: true,
});

const rows = data.map((row) => ({
  isbn13: row.isbn13 || null,
  isbn10: row.isbn10 || null,
  title: row.title,
  subtitle: row.subtitle || null,
  authors: row.authors || null,
  categories: row.categories || null,
  thumbnail: row.thumbnail || null,
  description: row.description || null,
  published_year: row.published_year ? parseInt(row.published_year) : null,
  average_rating: row.average_rating ? parseFloat(row.average_rating) : null,
  num_pages: row.num_pages ? parseInt(row.num_pages) : null,
  ratings_count: row.ratings_count ? parseInt(row.ratings_count) : null,
}));

const BATCH_SIZE = 500;
for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  await db.insert(books).values(rows.slice(i, i + BATCH_SIZE));
}

console.log(`Seeded ${rows.length} books.`);
process.exit(0);
```

- [ ] **Step 2: Run the seed script**

```bash
bun db:seed
```

Expected output: `Seeded XXXX books.` with no errors.

- [ ] **Step 3: Verify row count**

```bash
docker compose exec db psql -U postgres -d booksclub -c "SELECT COUNT(*) FROM books;"
```

Expected: count matches number of rows in `books.csv` (minus the header).

---

### Task 5: Express Server, Middleware & Routes

**Files:**
- Create: `src/middleware/errorHandler.ts`
- Create: `src/routes/health.ts`
- Create: `src/routes/books.ts`
- Create: `src/routes/index.ts`
- Create: `src/server.ts`

**Interfaces:**
- Consumes: `db` from `src/db/index.ts`, `books` from `src/db/schema.ts`.
- Produces: HTTP server on `PORT` (default `8080`); `GET /health` and `GET /books`.

- [ ] **Step 1: Create `src/middleware/errorHandler.ts`**

```typescript
import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
}
```

- [ ] **Step 2: Create `src/routes/health.ts`**

```typescript
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
```

- [ ] **Step 3: Create `src/routes/books.ts`**

```typescript
import { Router } from "express";
import { db } from "../db/index";
import { books } from "../db/schema";

export const booksRouter = Router();

booksRouter.get("/books", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const results = await db.select().from(books).limit(limit).offset(offset);
    res.json({ data: results, page, limit });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Create `src/routes/index.ts`**

```typescript
import { Router } from "express";
import { healthRouter } from "./health";
import { booksRouter } from "./books";

export const router = Router();

router.use(healthRouter);
router.use(booksRouter);
```

- [ ] **Step 5: Create `src/server.ts`**

```typescript
import express from "express";
import { router } from "./routes/index";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(router);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 6: Start the dev server**

```bash
bun dev
```

Expected: `Server running on http://localhost:8080`

- [ ] **Step 7: Verify `/health`**

In a new terminal:

```bash
curl http://localhost:8080/health
```

Expected: `{"status":"ok","timestamp":"..."}` (HTTP 200)

- [ ] **Step 8: Verify `/books`**

```bash
curl "http://localhost:8080/books?page=1&limit=5"
```

Expected: `{"data":[{...}, {...}],"page":1,"limit":5}` with 5 book objects.

- [ ] **Step 9: Verify pagination**

```bash
curl "http://localhost:8080/books?page=2&limit=5"
```

Expected: different 5 books than page 1.
