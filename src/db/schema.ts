import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  real,
  vector,
  index,
} from "drizzle-orm/pg-core";

const EMBEDDING_DIMENSIONS = {
  "text-embedding-3-small": 1536, // openai model
  "nomic-embed-text": 768, // ollama model
};

export const books = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    isbn13: varchar("isbn13", { length: 13 }),
    isbn10: varchar("isbn10", { length: 10 }),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    authors: text("authors"),
    categories: text("categories"),
    thumbnail: text("thumbnail"),
    description: text("description"),
    published_year: integer("published_year"),
    average_rating: real("average_rating"),
    num_pages: integer("num_pages"),
    ratings_count: integer("ratings_count"),
    embedding: vector("embedding", {
      dimensions: EMBEDDING_DIMENSIONS["nomic-embed-text"],
    }),
  },
  (table) => [
    index("books_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
