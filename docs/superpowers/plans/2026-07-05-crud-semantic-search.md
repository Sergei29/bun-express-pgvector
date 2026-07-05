# CRUD + Semantic Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement POST, PUT, DELETE, and GET /api/books/search handlers with Ollama embeddings, full test coverage, and a ZodError → 400 patch to the error handler.

**Architecture:** Four route handlers are added to `src/routes/books.ts` (stubs already exist). A new test file `src/routes/books-write.test.ts` isolates all write + search tests with module-level mocks for both `@/db` and `@/db/ollama`. The global error handler is patched once in Task 1 (driven by the POST validation test).

**Tech Stack:** Bun, Express 4, Drizzle ORM 0.44 (`eq`, `cosineDistance` from `drizzle-orm`), Zod, Ollama (`getEmbedding` from `@/db/ollama`), `bun:test`, supertest.

## Global Constraints

- Runtime: Bun — all imports use `@/` path alias (`@/*` → `src/*`), never relative `../`
- Test runner: `bun test`
- Quality gate after every task: `bun check-all` (format:check + type-check + test) must pass
- **Commit policy: do NOT run `git commit` — user commits manually**
- Route ordering: static routes must precede parameterized ones — `GET /api/books/search` must be registered before `PUT /api/books/:id`

---

## File Map

| File | Change |
|---|---|
| `src/middleware/errorHandler.ts` | Add `ZodError → 400` check (Task 1) |
| `src/routes/books.ts` | Fill POST (Task 1), DELETE (Task 2), PUT (Task 3), GET search (Task 4) |
| `src/routes/books-write.test.ts` | Create with mock scaffold + POST tests (Task 1); append DELETE (Task 2), PUT (Task 3), search (Task 4) |

---

## Task 1: POST /api/books + errorHandler ZodError fix

**Files:**
- Create: `src/routes/books-write.test.ts`
- Modify: `src/middleware/errorHandler.ts`
- Modify: `src/routes/books.ts`

**Interfaces:**
- Consumes: `createBookInputSchema` from `@/lib/validation`, `getEmbedding` from `@/db/ollama`, `db.insert(books).values({...}).returning()` from `@/db`
- Produces: `POST /api/books` → `201 { ...book }` | `400 { error }` | `500 { error }`

- [ ] **Step 1: Create `src/routes/books-write.test.ts` with mock scaffold and POST test cases**

```typescript
import { beforeEach, describe, expect, it, mock } from "bun:test";
import request from "supertest";

// ── Ollama mock ──────────────────────────────────────────────────────────────
const MOCK_EMBEDDING = Array<number>(768).fill(0.1);
let getEmbeddingCallCount = 0;
let ollamaError: Error | null = null;

mock.module("@/db/ollama", () => ({
  getEmbedding: async (_text: string) => {
    getEmbeddingCallCount++;
    if (ollamaError) throw ollamaError;
    return MOCK_EMBEDDING;
  },
}));

// ── DB mock ──────────────────────────────────────────────────────────────────
let insertData: any[] = [];
let selectData: any[] = [];
let updateData: any[] = [];
let deleteData: any[] = [];
let dbError: Error | null = null;

mock.module("@/db", () => ({
  db: {
    insert: (_table: any) => ({
      values: (_vals: any) => ({
        returning: () =>
          dbError ? Promise.reject(dbError) : Promise.resolve(insertData),
      }),
    }),
    select: (_cols?: any) => ({
      from: (_table: any) => ({
        where: (_cond: any) => ({
          limit: (_n: number) =>
            dbError ? Promise.reject(dbError) : Promise.resolve(selectData),
        }),
        orderBy: (_expr: any) => ({
          limit: (_n: number) =>
            dbError ? Promise.reject(dbError) : Promise.resolve(selectData),
        }),
      }),
    }),
    update: (_table: any) => ({
      set: (_vals: any) => ({
        where: (_cond: any) => ({
          returning: () =>
            dbError ? Promise.reject(dbError) : Promise.resolve(updateData),
        }),
      }),
    }),
    delete: (_table: any) => ({
      where: (_cond: any) => ({
        returning: () =>
          dbError ? Promise.reject(dbError) : Promise.resolve(deleteData),
      }),
    }),
  },
}));

const { app } = await import("@/app");

// ── Shared fixture ────────────────────────────────────────────────────────────
const mockBook = {
  id: 1,
  isbn13: "9780132350884",
  isbn10: "0132350882",
  title: "Clean Code",
  subtitle: "A Handbook of Agile Software Craftsmanship",
  authors: "Robert C. Martin",
  categories: "Computers",
  thumbnail: null,
  description: "Even bad code can function.",
  published_year: 2008,
  average_rating: 4.17,
  num_pages: 431,
  ratings_count: 12345,
  embedding: null,
};

// ── POST /api/books ───────────────────────────────────────────────────────────
describe("POST /api/books", () => {
  beforeEach(() => {
    insertData = [mockBook];
    selectData = [];
    updateData = [];
    deleteData = [];
    dbError = null;
    getEmbeddingCallCount = 0;
    ollamaError = null;
  });

  it("returns 201 with the created book on a valid body", async () => {
    const res = await request(app)
      .post("/api/books")
      .send({ title: "Clean Code", authors: "Robert C. Martin" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(mockBook);
    expect(getEmbeddingCallCount).toBe(1);
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/books")
      .send({ authors: "Someone" });
    expect(res.status).toBe(400);
  });

  it("returns 500 when Ollama fails", async () => {
    ollamaError = new Error("Ollama unavailable");
    const res = await request(app)
      .post("/api/books")
      .send({ title: "A Book" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Ollama unavailable");
  });
});
```

- [ ] **Step 2: Run the POST tests — expect all to fail**

```bash
bun test src/routes/books-write.test.ts
```

Expected: POST tests fail (no-response timeout or wrong status codes — stub is unimplemented).

- [ ] **Step 3: Patch `src/middleware/errorHandler.ts` to return 400 for ZodError**

Replace the entire file contents with:

```typescript
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.message });
    return;
  }
  console.error(err.stack);
  res.status(500).json({ error: err.message });
}
```

- [ ] **Step 4: Implement POST handler in `src/routes/books.ts`**

Replace the existing import block and POST stub. The final top of the file (imports + GET list + POST handler):

```typescript
import { Router } from "express";
import { eq, cosineDistance } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema";
import { getEmbedding } from "@/db/ollama";
import { createBookInputSchema, updateBookInputSchema } from "@/lib/validation";

export const booksRouter = Router();

booksRouter.get("/api/books", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const offset = (page - 1) * limit;

    const results = await db.select().from(books).limit(limit).offset(offset);
    res.json({ data: results, page, limit });
  } catch (err) {
    next(err);
  }
});

booksRouter.post("/api/books", async (req, res, next) => {
  try {
    const parsed = createBookInputSchema.parse(req.body);
    const embeddingText = [
      parsed.title,
      parsed.subtitle,
      parsed.authors,
      parsed.categories,
      parsed.description,
    ]
      .filter(Boolean)
      .join(" ");
    const embedding = await getEmbedding(embeddingText);
    const [book] = await db
      .insert(books)
      .values({ ...parsed, embedding })
      .returning();
    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
});

booksRouter.put("/api/books/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const validation = updateBookInputSchema.parse(req.body);
    /**
     * 1. if book exists, else return 404
     * 2. IF title,subtitle,authors,categories,description changed then get embed from Ollama
     * 3. update existing book
     */
  } catch (err) {
    next(err);
  }
});

booksRouter.delete("/api/books/:id", async (req, res, next) => {
  try {
    /**
     * 1. if books exist, else return 404
     * 2. delete book
     */
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 5: Run POST tests — expect all three to pass**

```bash
bun test src/routes/books-write.test.ts
```

Expected: all 3 POST tests pass. PUT/DELETE tests do not exist yet.

- [ ] **Step 6: Run full quality gate**

```bash
bun check-all
```

Expected: all checks pass (format + types + all tests including pre-existing health and GET books tests).

---

## Task 2: DELETE /api/books/:id

**Files:**
- Modify: `src/routes/books-write.test.ts` (append DELETE describe block)
- Modify: `src/routes/books.ts` (fill DELETE stub)

**Interfaces:**
- Consumes: `db.delete(books).where(eq(books.id, id)).returning()` from `@/db`
- Produces: `DELETE /api/books/:id` → `204 (no body)` | `400 { error }` | `404 { error }`

- [ ] **Step 1: Append DELETE test block to `src/routes/books-write.test.ts`**

Add after the closing `});` of the POST describe block:

```typescript
// ── DELETE /api/books/:id ─────────────────────────────────────────────────────
describe("DELETE /api/books/:id", () => {
  beforeEach(() => {
    insertData = [];
    selectData = [];
    updateData = [];
    deleteData = [mockBook];
    dbError = null;
    getEmbeddingCallCount = 0;
    ollamaError = null;
  });

  it("returns 204 when the book is deleted", async () => {
    const res = await request(app).delete("/api/books/1");
    expect(res.status).toBe(204);
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await request(app).delete("/api/books/abc");
    expect(res.status).toBe(400);
  });

  it("returns 404 when the book does not exist", async () => {
    deleteData = [];
    const res = await request(app).delete("/api/books/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Book not found");
  });
});
```

- [ ] **Step 2: Run DELETE tests — expect all to fail**

```bash
bun test src/routes/books-write.test.ts --testNamePattern "DELETE"
```

Expected: DELETE tests fail (stub sends no response).

- [ ] **Step 3: Replace the DELETE stub in `src/routes/books.ts`**

Replace:
```typescript
booksRouter.delete("/api/books/:id", async (req, res, next) => {
  try {
    /**
     * 1. if books exist, else return 404
     * 2. delete book
     */
  } catch (err) {
    next(err);
  }
});
```

With:
```typescript
booksRouter.delete("/api/books/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [deleted] = await db
      .delete(books)
      .where(eq(books.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Run DELETE tests — expect all three to pass**

```bash
bun test src/routes/books-write.test.ts --testNamePattern "DELETE"
```

Expected: all 3 DELETE tests pass.

- [ ] **Step 5: Run full quality gate**

```bash
bun check-all
```

Expected: all checks pass.

---

## Task 3: PUT /api/books/:id

**Files:**
- Modify: `src/routes/books-write.test.ts` (append PUT describe block)
- Modify: `src/routes/books.ts` (replace PUT stub)

**Interfaces:**
- Consumes: `updateBookInputSchema` from `@/lib/validation`, `getEmbedding` from `@/db/ollama`, `db.select().from(books).where(eq(...)).limit(1)`, `db.update(books).set({...}).where(eq(...)).returning()`
- Produces: `PUT /api/books/:id` → `200 { ...book }` | `400 { error }` | `404 { error }` | `500 { error }`

- [ ] **Step 1: Append PUT test block to `src/routes/books-write.test.ts`**

Add after the closing `});` of the DELETE describe block:

```typescript
// ── PUT /api/books/:id ────────────────────────────────────────────────────────
describe("PUT /api/books/:id", () => {
  beforeEach(() => {
    insertData = [];
    selectData = [mockBook];
    updateData = [mockBook];
    deleteData = [];
    dbError = null;
    getEmbeddingCallCount = 0;
    ollamaError = null;
  });

  it("returns 200 with updated book on a valid body", async () => {
    const res = await request(app)
      .put("/api/books/1")
      .send({ average_rating: 4.5 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockBook);
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await request(app)
      .put("/api/books/abc")
      .send({ average_rating: 4.5 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body fails schema validation", async () => {
    const res = await request(app)
      .put("/api/books/1")
      .send({ published_year: "not-a-number" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the book does not exist", async () => {
    selectData = [];
    const res = await request(app)
      .put("/api/books/999")
      .send({ average_rating: 4.5 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Book not found");
  });

  it("calls getEmbedding when a semantic field is present in the payload", async () => {
    const res = await request(app)
      .put("/api/books/1")
      .send({ title: "New Title" });
    expect(res.status).toBe(200);
    expect(getEmbeddingCallCount).toBe(1);
  });

  it("skips getEmbedding when only non-semantic fields are updated", async () => {
    const res = await request(app)
      .put("/api/books/1")
      .send({ average_rating: 4.5, num_pages: 300 });
    expect(res.status).toBe(200);
    expect(getEmbeddingCallCount).toBe(0);
  });

  it("returns 500 when Ollama fails during re-embedding", async () => {
    ollamaError = new Error("Ollama unavailable");
    const res = await request(app)
      .put("/api/books/1")
      .send({ title: "New Title" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Ollama unavailable");
  });
});
```

- [ ] **Step 2: Run PUT tests — expect all to fail**

```bash
bun test src/routes/books-write.test.ts --testNamePattern "PUT"
```

Expected: PUT tests fail (stub has incomplete implementation).

- [ ] **Step 3: Replace the PUT stub in `src/routes/books.ts`**

Replace:
```typescript
booksRouter.put("/api/books/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const validation = updateBookInputSchema.parse(req.body);
    /**
     * 1. if book exists, else return 404
     * 2. IF title,subtitle,authors,categories,description changed then get embed from Ollama
     * 3. update existing book
     */
  } catch (err) {
    next(err);
  }
});
```

With:
```typescript
booksRouter.put("/api/books/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = updateBookInputSchema.parse(req.body);
    const [existing] = await db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    const SEMANTIC_FIELDS = [
      "title",
      "subtitle",
      "authors",
      "categories",
      "description",
    ] as const;
    let embedding: number[] | undefined;
    if (SEMANTIC_FIELDS.some((f) => f in parsed)) {
      const merged = { ...existing, ...parsed };
      const embeddingText = [
        merged.title,
        merged.subtitle,
        merged.authors,
        merged.categories,
        merged.description,
      ]
        .filter(Boolean)
        .join(" ");
      embedding = await getEmbedding(embeddingText);
    }
    const [updated] = await db
      .update(books)
      .set({ ...parsed, ...(embedding ? { embedding } : {}) })
      .where(eq(books.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Run PUT tests — expect all seven to pass**

```bash
bun test src/routes/books-write.test.ts --testNamePattern "PUT"
```

Expected: all 7 PUT tests pass.

- [ ] **Step 5: Run full quality gate**

```bash
bun check-all
```

Expected: all checks pass.

---

## Task 4: GET /api/books/search

**Files:**
- Modify: `src/routes/books-write.test.ts` (append search describe block)
- Modify: `src/routes/books.ts` (add search handler **before** the PUT handler)

**Interfaces:**
- Consumes: `getEmbedding` from `@/db/ollama`, `cosineDistance` from `drizzle-orm`, `db.select({...columns + distance}).from(books).orderBy(distanceExpr).limit(10)`
- Produces: `GET /api/books/search?q=...` → `200 [{...book, distance: number}]` | `400 { error }` | `500 { error }`

- [ ] **Step 1: Append search test block to `src/routes/books-write.test.ts`**

Add after the closing `});` of the PUT describe block:

```typescript
// ── GET /api/books/search ─────────────────────────────────────────────────────
describe("GET /api/books/search", () => {
  beforeEach(() => {
    insertData = [];
    selectData = [{ ...mockBook, distance: 0.15 }];
    updateData = [];
    deleteData = [];
    dbError = null;
    getEmbeddingCallCount = 0;
    ollamaError = null;
  });

  it("returns 200 with results and distance scores", async () => {
    const res = await request(app).get("/api/books/search?q=clean+code");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ title: "Clean Code", distance: 0.15 });
    expect(getEmbeddingCallCount).toBe(1);
  });

  it("returns 400 when q is missing", async () => {
    const res = await request(app).get("/api/books/search");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("'q'");
  });

  it("returns 400 when q is an empty string", async () => {
    const res = await request(app).get("/api/books/search?q=");
    expect(res.status).toBe(400);
  });

  it("returns 500 when Ollama fails", async () => {
    ollamaError = new Error("Ollama unavailable");
    const res = await request(app).get("/api/books/search?q=design+patterns");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Ollama unavailable");
  });
});
```

- [ ] **Step 2: Run search tests — expect all to fail**

```bash
bun test src/routes/books-write.test.ts --testNamePattern "search"
```

Expected: all 4 search tests fail — no GET handler matches `/api/books/search`, so Express returns 404 for every request.

- [ ] **Step 3: Add search handler to `src/routes/books.ts` — insert it before the PUT handler**

In `src/routes/books.ts`, insert the following block **immediately before** the `booksRouter.put` line:

```typescript
booksRouter.get("/api/books/search", async (req, res, next) => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim() === "") {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }
    const embedding = await getEmbedding(q);
    const distanceExpr = cosineDistance(books.embedding, embedding);
    const results = await db
      .select({
        id: books.id,
        isbn13: books.isbn13,
        isbn10: books.isbn10,
        title: books.title,
        subtitle: books.subtitle,
        authors: books.authors,
        categories: books.categories,
        thumbnail: books.thumbnail,
        description: books.description,
        published_year: books.published_year,
        average_rating: books.average_rating,
        num_pages: books.num_pages,
        ratings_count: books.ratings_count,
        distance: distanceExpr,
      })
      .from(books)
      .orderBy(distanceExpr)
      .limit(10);
    res.json(results);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Run search tests — expect all four to pass**

```bash
bun test src/routes/books-write.test.ts --testNamePattern "search"
```

Expected: all 4 search tests pass.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
bun test
```

Expected: all tests across all files pass (health, GET books, POST books, DELETE books, PUT books, search).

- [ ] **Step 6: Run full quality gate**

```bash
bun check-all
```

Expected: format + types + all tests pass. Implementation is complete.
