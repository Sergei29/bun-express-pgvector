# CRUD + Semantic Search — Design Spec

**Date:** 2026-07-05
**Branch:** crud-books-and-ai-search
**Status:** Approved

---

## Context

The `GET /api/books` paginated list endpoint is already implemented and tested. Route prefix migration (`/books` → `/api/books`) is complete. Zod validation schemas (`createBookInputSchema`, `updateBookInputSchema`) exist in `src/lib/validation.ts`. Ollama embedding utility (`getEmbedding`) is in `src/db/ollama.ts`. Route stubs with comment scaffolding exist in `src/routes/books.ts`.

---

## Endpoints

### POST /api/books

1. Zod-parse `req.body` via `createBookInputSchema`. Zod throws on invalid input — the global error handler returns 400.
2. Build embedding input string by joining non-null fields: `title`, `subtitle`, `authors`, `categories`, `description` (space-separated, falsy values excluded).
3. Call `getEmbedding(embeddingText)` from `@/db/ollama`. Propagate errors to `next()`.
4. `db.insert(books).values({ ...parsed, embedding }).returning()`.
5. Return **201** with the inserted book object.

### PUT /api/books/:id

1. Parse `id` as integer — return **400** if `NaN`.
2. Zod-parse `req.body` via `updateBookInputSchema`.
3. Existence check: `db.select().from(books).where(eq(books.id, id)).limit(1)`. Return **404** if empty.
4. If any of `{ title, subtitle, authors, categories, description }` is present in the validated payload, rebuild embedding text and call `getEmbedding()`. Include the new embedding in the update payload.
5. `db.update(books).set({ ...parsed, ...(embedding && { embedding }) }).where(eq(books.id, id)).returning()`.
6. Return **200** with the updated book.

### DELETE /api/books/:id

1. Parse `id` as integer — return **400** if `NaN`.
2. `db.delete(books).where(eq(books.id, id)).returning()`. Return **404** if the returned array is empty.
3. Return **204** with no body.

### GET /api/books/search?q=...

1. Extract `req.query.q`. Return **400** if missing or empty string.
2. Call `getEmbedding(q)`.
3. Query using Drizzle `sql` tag for cosine distance:
   ```sql
   SELECT *, (embedding <=> $vector::vector) AS distance
   FROM books
   ORDER BY embedding <=> $vector::vector
   LIMIT 10
   ```
4. Return array of book objects each augmented with a `distance: number` field (lower = more similar).

---

## Error Handling

All handlers use `try/catch` → `next(err)`. The existing global `errorHandler` currently always returns 500. It needs one targeted update: check `err instanceof ZodError` and return 400 instead. This keeps all validation error formatting in one place and avoids per-handler `instanceof` checks.

```typescript
if (err instanceof ZodError) {
  return res.status(400).json({ error: err.message });
}
```

Manual 404 responses are returned directly in handlers (not via `next()`), since the existing errorHandler has no status-code concept beyond 500.

---

## Testing

**New file:** `src/routes/books-write.test.ts`

Both `@/db` and `@/db/ollama` are mocked at module level via `mock.module()` before `import("@/app")`.

The `@/db` mock exposes a `mockDb` object with controllable per-test behavior for `insert`, `update`, `delete`, `select`, and raw `sql` queries. A `rejectWith` escape hatch allows simulating DB errors.

The `@/db/ollama` mock exports a `getEmbedding` stub that resolves to a fixed 768-element array by default, with a per-test override to simulate Ollama failure.

**Cases covered per endpoint:**

| Endpoint | Cases |
|---|---|
| POST /api/books | happy path (201 + book), invalid body (400), Ollama failure (500) |
| PUT /api/books/:id | happy path (200 + book), invalid id (400), not found (404), semantic field triggers re-embed, non-semantic-only update skips re-embed, Ollama failure (500) |
| DELETE /api/books/:id | happy path (204), invalid id (400), not found (404) |
| GET /api/books/search | happy path (200 + [{...book, distance}]), missing q (400), Ollama failure (500) |

**Existing `books.test.ts` is not modified** — GET tests remain isolated in their own mock context.

---

## Files Changed

| File | Change |
|---|---|
| `src/routes/books.ts` | Fill in 4 route stubs |
| `src/routes/books-write.test.ts` | New — write tests for POST, PUT, DELETE, Search |
| `src/middleware/errorHandler.ts` | Add `ZodError` → 400 check |
| `src/lib/validation.ts` | No change (schemas already complete) |
| `src/db/ollama.ts` | No change |
| `src/db/schema.ts` | No change |
