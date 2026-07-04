import { readdirSync } from "fs";
import { join } from "path";
import { db } from "@/db";
import { books } from "@/db/schema";
import Papa from "papaparse";

const bulkDir = join(import.meta.dir, "bulk");
const csvFiles = readdirSync(bulkDir).filter((f) => f.endsWith(".csv"));

if (csvFiles.length === 0) {
  throw new Error(`No .csv files found in ${bulkDir}`);
}

const csvFilename = csvFiles[0];
console.log(`Using CSV file: ${csvFilename}`);

const file = Bun.file(join(bulkDir, csvFilename));
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
