import { describe, expect, it, mock } from "bun:test";
import request from "supertest";

mock.module("@/db", () => ({ db: {} }));

const { app } = await import("@/app");

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("returns a valid ISO timestamp", async () => {
    const res = await request(app).get("/health");
    const { timestamp } = res.body;
    expect(typeof timestamp).toBe("string");
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
