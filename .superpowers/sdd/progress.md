# SDD Progress Ledger
Plan: docs/superpowers/plans/2026-07-03-boilerplate-setup.md

## Tasks
- Task 1: Project Scaffold — COMPLETE
- Task 2: Docker Compose + pgvector — COMPLETE
- Task 3: Drizzle Config, Schema & DB Connection — COMPLETE
- Task 4: Seed Script — COMPLETE
- Task 5: Express Server, Middleware & Routes — COMPLETE

## Plan: Ollama Embedding Pipeline (toasty-enchanting-lynx.md)
- Task 1: Config — env vars + db:embed script — COMPLETE (commits f294042..61b31ee, review clean; prettier false-positive adjudicated — was pre-existing in bun.lock)
- Task 2: Create src/db/ollama.ts + unit tests — COMPLETE (commits 61b31ee..e7009bd, review clean; 3 minor findings noted for final review)
- Task 3: Update src/db/embedding.ts — robust runner — COMPLETE (commits e7009bd..708be4e, review clean)
- Task 4: HNSW index via Drizzle migration — COMPLETE (commits 708be4e..593cf89, review clean; minor: trailing newlines in SQL files, unused EMBEDDING_DIMENSIONS["text-embedding-3-small"])
- Fix: getEmbedding response shape guard — COMPLETE (commit 320e447, re-review clean)
- Final whole-branch review: PASSED (f294042..320e447)

## Plan: CRUD + Semantic Search (toasty-enchanting-lynx.md)
- Task 1: Route prefix migration (GET /books → /api/books) — COMPLETE (working tree, no commit per policy, review clean)

## Plan: CRUD + Semantic Search (2026-07-05-crud-semantic-search.md)
- Task 1: POST /api/books + errorHandler ZodError fix — COMPLETE (working tree, no commit per policy, review clean; 4 minor notes all plan-prescribed scaffolding)
- Task 2: DELETE /api/books/:id — COMPLETE (working tree, no commit per policy, review clean; minor: cosineDistance import unused until Task 4, PUT stub unused locals until Task 3 — both plan-prescribed)
- Refactor: shared DB mock (src/test-helpers/db-mock.ts) — COMPLETE (working tree, no commit per policy, review clean; minor: books.test.ts resets only 2/5 dbMock fields — harmless)
- Task 3: PUT /api/books/:id — COMPLETE (working tree, no commit per policy, review clean; minor: updateBookInputSchema.title .nullable() removed — correct fix, matches notNull() DB column)
- Task 4: GET /api/books/search — COMPLETE (working tree, no commit per policy, review clean; no findings)
- Final fixes: empty PUT body guard (400) + DB-error tests for all 4 endpoints — COMPLETE (working tree, review clean; 34/34 tests pass)
