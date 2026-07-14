import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Adapter } from "@auth/core/adapters";
import { db } from "@/db";
import { users, accounts, verificationTokens } from "@/db/schema";

/**
 * Drizzle-backed Auth.js adapter.
 *
 * Note: with `session.strategy: "jwt"` (required for the Credentials
 * provider, see config.ts), Auth.js does NOT call any adapter methods for
 * credentials sign-in (createUser/linkAccount/createSession/etc), and under
 * the `jwt` session strategy Auth.js never invokes the adapter's session
 * CRUD methods (createSession/getSessionAndUser/deleteSession/updateSession)
 * for ANY provider — sessions are self-contained signed JWTs in the cookie.
 * The adapter is still wired up so `users`/`accounts`/`verificationTokens`
 * persist to Postgres (so OAuth providers can be added later that use it
 * for account linking).
 *
 * `sessionsTable` is intentionally omitted here: our `sessions` table (see
 * db/schema.ts) uses a separate `id` uuid primary key with `sessionToken`
 * as a unique column, whereas `@auth/drizzle-adapter`'s bundled TypeScript
 * types for the default Postgres schema require `sessionToken` itself to be
 * the primary key column. Passing our table would be a type error. Since
 * the adapter's session methods are dead code under `session.strategy:
 * "jwt"` (see above), omitting it has no runtime effect — the adapter
 * quietly falls back to an internal, unused placeholder table definition.
 */
let cachedAdapter: Adapter | undefined;

function getRealAdapter(): Adapter {
  cachedAdapter ??= DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  });
  return cachedAdapter;
}

/**
 * Constructing `DrizzleAdapter(db, ...)` runs an immediate runtime check
 * (`is(db, PgDatabase)`) against the concrete `db` client. Route tests stub
 * `@/db` with a plain mock object (see test-helpers/db-mock.ts) that isn't a
 * real Drizzle `PgDatabase` instance, which would make that check throw as
 * an unhandled error the moment this module is imported — even though those
 * tests never touch `/auth/*`. Proxying defers the real construction (and
 * that check) until an adapter method is actually invoked, which only
 * happens for real auth flows.
 */
export const authAdapter: Adapter = new Proxy({} as Adapter, {
  get(_target, prop, receiver) {
    return Reflect.get(getRealAdapter(), prop, receiver);
  },
});
