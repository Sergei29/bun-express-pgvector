import { db } from "./index";
import { books } from "./schema";
import Papa from "papaparse";

const file = Bun.file("books.csv");
const text = await file.text();

const { data } = Papa.parse<Record<string, string>>(text, {
  header: true,
  skipEmptyLines: true,
});

const rows = data.map((row) => ({
  isbn13: row.isbn13 || null,
  isbn10: row.isbn10 || null,
  title: row.title,
  subtitle: row.subtitle || null,
  authors: row.authors || null,
  categories: row.categories || null,
  thumbnail: row.thumbnail || null,
  description: row.description || null,
  published_year: row.published_year ? parseInt(row.published_year) : null,
  average_rating: row.average_rating ? parseFloat(row.average_rating) : null,
  num_pages: row.num_pages ? parseInt(row.num_pages) : null,
  ratings_count: row.ratings_count ? parseInt(row.ratings_count) : null,
}));

const BATCH_SIZE = 500;
for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  await db.insert(books).values(rows.slice(i, i + BATCH_SIZE));
}

console.log(`Seeded ${rows.length} books.`);
process.exit(0);
