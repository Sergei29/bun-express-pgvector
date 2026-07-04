import { pgTable, serial, text, varchar, integer, real } from "drizzle-orm/pg-core";

export const books = pgTable("books", {
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
});
