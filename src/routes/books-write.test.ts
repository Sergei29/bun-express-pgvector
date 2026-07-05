import { beforeEach, describe, expect, it, mock } from "bun:test";
import request from "supertest";
import { createDbMockModule, dbMock } from "@/test-helpers/db-mock";

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
mock.module("@/db", createDbMockModule);

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
    dbMock.insertData = [mockBook];
    dbMock.selectData = [];
    dbMock.updateData = [];
    dbMock.deleteData = [];
    dbMock.dbError = null;
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
    const res = await request(app).post("/api/books").send({ title: "A Book" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Ollama unavailable");
  });

  it("returns 500 when the database throws", async () => {
    dbMock.dbError = new Error("DB connection lost");
    const res = await request(app).post("/api/books").send({ title: "A Book" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("DB connection lost");
  });
});

// ── DELETE /api/books/:id ─────────────────────────────────────────────────────
describe("DELETE /api/books/:id", () => {
  beforeEach(() => {
    dbMock.insertData = [];
    dbMock.selectData = [];
    dbMock.updateData = [];
    dbMock.deleteData = [mockBook];
    dbMock.dbError = null;
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
    dbMock.deleteData = [];
    const res = await request(app).delete("/api/books/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Book not found");
  });

  it("returns 500 when the database throws", async () => {
    dbMock.dbError = new Error("DB connection lost");
    const res = await request(app).delete("/api/books/1");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("DB connection lost");
  });
});

// ── PUT /api/books/:id ────────────────────────────────────────────────────────
describe("PUT /api/books/:id", () => {
  beforeEach(() => {
    dbMock.insertData = [];
    dbMock.selectData = [mockBook];
    dbMock.updateData = [mockBook];
    dbMock.deleteData = [];
    dbMock.dbError = null;
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
    dbMock.selectData = [];
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

  it("returns 400 when the request body is empty", async () => {
    const res = await request(app).put("/api/books/1").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("returns 500 when the database throws", async () => {
    dbMock.dbError = new Error("DB connection lost");
    const res = await request(app)
      .put("/api/books/1")
      .send({ average_rating: 4.5 });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("DB connection lost");
  });
});

// ── GET /api/books/search ─────────────────────────────────────────────────────
describe("GET /api/books/search", () => {
  beforeEach(() => {
    dbMock.insertData = [];
    dbMock.selectData = [{ ...mockBook, distance: 0.15 }];
    dbMock.updateData = [];
    dbMock.deleteData = [];
    dbMock.dbError = null;
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

  it("returns 500 when the database throws", async () => {
    dbMock.dbError = new Error("DB connection lost");
    const res = await request(app).get("/api/books/search?q=clean+code");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("DB connection lost");
  });
});
