import { isNull, eq, notInArray, and } from "drizzle-orm";
import { db } from "./";
import { books } from "./schema";
import { waitForOllama, getEmbedding } from "./ollama";

const CHUNK_SIZE = parseInt(process.env.EMBEDDING_CHUNK_SIZE ?? "20", 10);

export const createBookSearchText = (book: typeof books.$inferSelect) =>
  `Title: ${book.title}
Subtitle: ${book.subtitle ?? ""}
Authors: ${book.authors ?? "Unknown"}
Categories: ${book.categories ?? ""}
Description: ${book.description ?? ""}`.trim();

const wait = (ms = 100) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 Starting embedding generation...");

  try {
    await waitForOllama();
  } catch (err) {
    console.error("❌ Ollama is not available:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log("✅ Ollama is ready.");

  let totalAttempted = 0;
  const failedIds: number[] = [];

  while (true) {
    const whereClause =
      failedIds.length > 0
        ? and(isNull(books.embedding), notInArray(books.id, failedIds))
        : isNull(books.embedding);

    const batch = await db.select().from(books).where(whereClause).limit(CHUNK_SIZE);

    if (batch.length === 0) {
      console.log("✅ All embeddable books processed. Exiting.");
      break;
    }

    console.log(
      `Processing ${batch.length} books (attempted so far: ${totalAttempted})…`
    );

    await Promise.all(
      batch.map(async (book) => {
        try {
          const vector = await getEmbedding(createBookSearchText(book));
          await db.update(books).set({ embedding: vector }).where(eq(books.id, book.id));
        } catch (err) {
          console.error(`❌ Failed book ID ${book.id} ("${book.title}"):`, err);
          failedIds.push(book.id);
        }
      })
    );

    totalAttempted += batch.length;
    await wait(100);
  }

  const succeeded = totalAttempted - failedIds.length;
  console.log("\n📊 Embedding run summary:");
  console.log(`   Attempted : ${totalAttempted}`);
  console.log(`   Succeeded : ${succeeded}`);
  console.log(`   Failed    : ${failedIds.length}`);
  if (failedIds.length > 0) {
    console.log(`   Failed IDs: ${failedIds.join(", ")}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Embedding script error:", err);
  process.exit(1);
});
