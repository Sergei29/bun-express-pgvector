import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  real,
  vector,
  index,
  uniqueIndex,
  uuid,
  timestamp,
  primaryKey,
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

export type Book = typeof books.$inferSelect;

// --- Auth.js (@auth/drizzle-adapter) tables ---
// Reference shape: https://authjs.dev/getting-started/adapters/drizzle
// UUID primary keys are generated application-side via crypto.randomUUID()
// (no pgcrypto extension / gen_random_uuid() — see TASK.md design decisions).

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    // Extra columns beyond the standard Auth.js schema:
    password: text("password"), // hashed, nullable — only set for credentials accounts
    role: text("role").default("user"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique_idx").on(table.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionToken: text("sessionToken").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("sessions_session_token_unique_idx").on(table.sessionToken),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;
