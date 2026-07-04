const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "nomic-embed-text";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForOllama(
  opts: { maxAttempts?: number; delayMs?: number } = {}
): Promise<void> {
  const { maxAttempts = 10, delayMs = 2000 } = opts;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${OLLAMA_URL}/`);
      if (res.ok) return;
    } catch {
      // not reachable yet
    }
    if (attempt < maxAttempts) {
      console.log(`Waiting for Ollama… (attempt ${attempt}/${maxAttempts})`);
      await wait(delayMs);
    }
  }
  throw new Error(`Ollama not reachable after ${maxAttempts} attempts`);
}

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt: text }),
  });

  if (!res.ok) {
    throw new Error(`Ollama responded with ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}
