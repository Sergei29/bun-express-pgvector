import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Looks up a user by email (case-sensitive, matches the unique index on
 * `users.email`). Returns the full DB row, including the hashed
 * `password` column — callers outside the auth module should not forward
 * `password` to clients.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user ?? null;
}

/**
 * Looks up a user by primary key (uuid). Returns the full DB row, including
 * the hashed `password` column — callers outside the auth module should not
 * forward `password` to clients.
 */
export async function findUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string | null;
}

/**
 * Creates a new credentials-based user. The plaintext `password` is hashed
 * with bcryptjs before being persisted; the plaintext value is never stored
 * or logged.
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      password: passwordHash,
      name: input.name ?? null,
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

/**
 * Compares a plaintext password against a bcrypt hash. Never compares or
 * logs plaintext passwords directly.
 */
export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
