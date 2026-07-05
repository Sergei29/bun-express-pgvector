import { beforeEach, describe, expect, it, mock } from "bun:test";
import request from "supertest";
import mockBooks from "@/mocks/books.json";
import { createDbMockModule, dbMock } from "@/test-helpers/db-mock";

mock.module("@/db", createDbMockModule);

const { app } = await import("@/app");

describe("GET /api/books", () => {
  beforeEach(() => {
    dbMock.selectData = mockBooks;
    dbMock.dbError = null;
  });

  it("returns 200 with data and default pagination meta", async () => {
    const res = await request(app).get("/api/books");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(mockBooks);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  it("reflects custom page and limit in response meta", async () => {
    const res = await request(app).get("/api/books?page=3&limit=5");
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(3);
    expect(res.body.limit).toBe(5);
  });

  it("clamps limit to 100 when limit exceeds maximum", async () => {
    const res = await request(app).get("/api/books?limit=999");
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
  });

  it("defaults page to 1 for invalid page values", async () => {
    const res = await request(app).get("/api/books?page=0");
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
  });

  it("returns 500 when the database throws", async () => {
    dbMock.dbError = new Error("TEST: connection refused");
    const res = await request(app).get("/api/books");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("TEST: connection refused");
  });
});
