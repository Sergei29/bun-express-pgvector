import Queue from "bull";
import { generateEmbeddingAsync } from "@/db/embedding";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const embeddingQueue = new Queue("embeddings", redisUrl);

// Job processor: run when jobs are dequeued
embeddingQueue.process(async (job) => {
  const { bookId } = job.data;
  console.log(`📦 Processing embedding job for book ${bookId}`);

  try {
    await generateEmbeddingAsync(bookId);
    console.log(`✅ Successfully embedded book ${bookId}`);
    return { success: true, bookId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to embed book ${bookId}: ${errorMsg}`);
    throw err; // Re-throw to trigger Bull's retry mechanism
  }
});

// Job event handlers for logging/monitoring
embeddingQueue.on("completed", (job) => {
  console.log(
    `📊 Embedding job ${job.id} completed for book ${job.data.bookId}`,
  );
});

embeddingQueue.on("failed", (job, err) => {
  console.error(
    `⚠️ Embedding job ${job.id} failed for book ${job.data.bookId}: ${err.message}`,
  );
});

embeddingQueue.on("stalled", (job) => {
  console.warn(
    `⏸️ Embedding job ${job.id} stalled for book ${job.data.bookId}`,
  );
});
