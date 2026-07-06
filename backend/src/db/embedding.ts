import { isNull, eq, notInArray, and } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema";
import { waitForOllama, getEmbedding } from "@/db/ollama";

const CHUNK_SIZE = parseInt(process.env.EMBEDDING_CHUNK_SIZE ?? "20", 10);

export const createBookSearchText = (book: typeof books.$inferSelect) =>
  `Title: ${book.title}
Subtitle: ${book.subtitle ?? ""}
Authors: ${book.authors ?? "Unknown"}
Categories: ${book.categories ?? ""}
Description: ${book.description ?? ""}`.trim();

const wait = (ms = 100) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function generateEmbeddingAsync(bookId: number): Promise<void> {
  try {
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!book) {
      console.warn(`Book ${bookId} not found for embedding`);
      return;
    }

    const embeddingText = createBookSearchText(book);
    const vector = await getEmbedding(embeddingText);

    await db
      .update(books)
      .set({ embedding: vector })
      .where(eq(books.id, bookId));

    console.log(`✅ Embedded book ${bookId} ("${book.title}")`);
  } catch (err) {
    console.error(
      `❌ Failed to embed book ${bookId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

async function main() {
  console.log("🚀 Starting embedding generation...");

  try {
    await waitForOllama();
  } catch (err) {
    console.error(
      "❌ Ollama is not available:",
      err instanceof Error ? err.message : err,
    );
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

    const batch = await db
      .select()
      .from(books)
      .where(whereClause)
      .limit(CHUNK_SIZE);

    if (batch.length === 0) {
      console.log("✅ All embeddable books processed. Exiting.");
      break;
    }

    console.log(
      `Processing ${batch.length} books (attempted so far: ${totalAttempted})…`,
    );

    await Promise.all(
      batch.map(async (book) => {
        try {
          const vector = await getEmbedding(createBookSearchText(book));
          await db
            .update(books)
            .set({ embedding: vector })
            .where(eq(books.id, book.id));
        } catch (err) {
          console.error(`❌ Failed book ID ${book.id} ("${book.title}"):`, err);
          failedIds.push(book.id);
        }
      }),
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

// Only run main() if this file is the entry point, not when imported
if (import.meta.main) {
  main().catch((err) => {
    console.error("Embedding script error:", err);
    process.exit(1);
  });
}
