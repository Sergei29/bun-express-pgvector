## Task title

- Implement CRUD with Live Vector Embeddings & Semantic Search

## Steps

Analyze first the task below: if the tasks can run independently - then fork the sub-agents to run in parallel

- Create Book Endpoint (POST /api/books), validate with zod schema at `src/lib/validation.ts`, + test
- Update Book Endpoint (PUT /api/books/:id), validate with zod schema at `src/lib/validation.ts`, + test
- Delete Book Endpoint (DELETE /api/books/:id) + test
- Semantic Search Endpoint (GET /api/books/search?q=...)
  - [ ] Extract the search string from req.query.q. Return 400 Bad Request if missing.
  - [ ] Await the generation of the search vector via the Ollama utility service.
  - [ ] Query the database using Cosine Distance (<=>) via Drizzle ORM syntax (cosineDistance()) or custom raw SQL injection if preferred.
  - [ ] Order by the lowest distance, cap the results with a .limit(10), and return the array of matching books accompanied by their calculated semantic distance scores.

## Acceptance criteria

- all checks pass
- application runs successfully on all endpoints
- can create new book create new book by running curl...
- can update this created book, update this newly created book by running curl...
- can delete this created and updated book, delete that newly created & updated book by running curl...
- can make a semantic query and receive the expected results, make a curl query and asses the response.
