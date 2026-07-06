import { Router } from "express";
import { eq, cosineDistance } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema";
import { getEmbedding } from "@/db/ollama";
import { embeddingQueue } from "@/queues/embedding";
import { createBookInputSchema, updateBookInputSchema } from "@/lib/validation";

export const booksRouter = Router();

booksRouter.get("/api/books", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const offset = (page - 1) * limit;

    const results = await db.select().from(books).limit(limit).offset(offset);
    res.json({ data: results, page, limit });
  } catch (err) {
    next(err);
  }
});

booksRouter.post("/api/books", async (req, res, next) => {
  try {
    const parsed = createBookInputSchema.parse(req.body);
    const [book] = await db
      .insert(books)
      .values({ ...parsed, embedding: null })
      .returning();

    // Queue embedding job with retry logic
    await embeddingQueue.add(
      { bookId: book.id },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
      },
    );

    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
});

booksRouter.get("/api/books/search", async (req, res, next) => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim() === "") {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }
    const embedding = await getEmbedding(q);
    const distanceExpr = cosineDistance(books.embedding, embedding);
    const results = await db
      .select({
        id: books.id,
        isbn13: books.isbn13,
        isbn10: books.isbn10,
        title: books.title,
        subtitle: books.subtitle,
        authors: books.authors,
        categories: books.categories,
        thumbnail: books.thumbnail,
        description: books.description,
        published_year: books.published_year,
        average_rating: books.average_rating,
        num_pages: books.num_pages,
        ratings_count: books.ratings_count,
        distance: distanceExpr,
      })
      .from(books)
      .orderBy(distanceExpr)
      .limit(10);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

booksRouter.put("/api/books/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = updateBookInputSchema.parse(req.body);
    if (Object.keys(parsed).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const [existing] = await db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    const SEMANTIC_FIELDS = [
      "title",
      "subtitle",
      "authors",
      "categories",
      "description",
    ] as const;

    const hasSemanticChanges = SEMANTIC_FIELDS.some((f) => f in parsed);
    const updateData = hasSemanticChanges
      ? { ...parsed, embedding: null }
      : parsed;

    const [updated] = await db
      .update(books)
      .set(updateData)
      .where(eq(books.id, id))
      .returning();

    // Queue embedding job if semantic fields changed
    if (hasSemanticChanges) {
      await embeddingQueue.add(
        { bookId: id },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true,
        },
      );
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

booksRouter.delete("/api/books/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [deleted] = await db
      .delete(books)
      .where(eq(books.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
