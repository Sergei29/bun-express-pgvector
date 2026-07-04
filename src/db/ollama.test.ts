import { describe, it, expect, spyOn } from "bun:test";
import { waitForOllama, getEmbedding } from "@/db/ollama";

describe("waitForOllama", () => {
  it("resolves when Ollama responds on first attempt", async () => {
    const spy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    await expect(
      waitForOllama({ maxAttempts: 3, delayMs: 0 }),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("retries and succeeds on attempt 2", async () => {
    const spy = spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    await expect(
      waitForOllama({ maxAttempts: 3, delayMs: 0 }),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("throws after exhausting all attempts", async () => {
    const spy = spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("ECONNREFUSED"),
    );
    await expect(waitForOllama({ maxAttempts: 3, delayMs: 0 })).rejects.toThrow(
      "Ollama not reachable after 3 attempts",
    );
    spy.mockRestore();
  });
});

describe("getEmbedding", () => {
  it("returns embedding array on success", async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    const spy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ embedding: mockEmbedding }), {
        status: 200,
      }),
    );
    const result = await getEmbedding("test text");
    expect(result).toEqual(mockEmbedding);
    spy.mockRestore();
  });

  it("throws with status in message on non-200 response", async () => {
    const spy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: "Internal Server Error" }),
    );
    await expect(getEmbedding("test text")).rejects.toThrow("500");
    spy.mockRestore();
  });
});
