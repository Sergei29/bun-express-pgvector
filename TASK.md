## Task title

Install, Configure and Implement Authentication on server side

## Objective

Implement a complete authentication system using **Auth.js** for the existing backend.

Current backend stack:

- Runtime: Bun
- Framework: Express.js
- Database: PostgreSQL (pgvector extension enabled)
- ORM: Drizzle ORM
- Language: TypeScript

The authentication system must integrate cleanly into the existing architecture and follow Auth.js best practices without introducing unnecessary abstractions.

---

## Design decisions (resolved during planning)

- **Session strategy: JWT, not database.** Auth.js does not support Credentials provider together with `session.strategy: "database"` — it throws `UnsupportedStrategy` at runtime. The Drizzle adapter is still wired up and persists `users`/`accounts` to Postgres (so OAuth providers can be added later and user data lives in the DB), but the session itself is a signed JWT cookie. Everywhere below that says "database session strategy" / "database sessions" means: adapter-backed user storage + JWT session tokens.
- **Password hashing: bcryptjs**, not bcrypt. Pure JS, avoids native-addon build issues under Bun.
- **UUID generation: application-side**, via `crypto.randomUUID()` as the Drizzle column default. No Postgres extension changes (no `pgcrypto`) needed alongside the existing `vector` extension.
- **Route protection scope:** `POST /api/books`, `PUT /api/books/:id`, `DELETE /api/books/:id` require auth. `GET` (list/search) routes stay public.
- **Schema additions beyond the standard Auth.js tables:** the `users` table needs a `password` column (hashed, nullable — only set for credentials accounts) and a `role` column (for Step 9's session callback), since neither exists in the default Auth.js/Drizzle adapter schema.

---

## Execution plan: what can run in parallel

Most of the 18 steps touch the same small set of files (`src/auth/*`) and are sequentially coupled — splitting those across parallel agents risks conflicting edits and duplicated auth logic, which the acceptance criteria explicitly forbid. Real parallelism is limited to work that touches disjoint files with no logical ordering dependency on each other.

**Prerequisite (blocking, do first, not worth parallelizing):**

- Step 1 — Install dependencies. Everything else that imports `@auth/*` or `bcryptjs` needs this done first. Trivial, seconds long.

**Wave 1 — fully independent, can run as parallel sub-agents once Step 1 completes:**
| Agent | Steps | Files touched | Why independent |
|---|---|---|---|
| A: DB schema + migration | 2, 3, 4 | `db/schema.ts`, generated `drizzle/` migration | Pure data layer, no dependency on app/auth code |
| B: Express type augmentation | 12 | new `src/types/express.d.ts` (or similar) | `req.user` shape (id/email/name/role) is already fixed by the design decisions above — doesn't need `auth.ts` to exist yet |
| C: Environment variables | 13 | `.env.example` | Var names already specified (`AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`, `SESSION_MAX_AGE`, `COOKIE_DOMAIN`); no code dependency |

**Wave 2 — single sequential unit, one agent only (do not split):**

- Steps 5, 6, 7, 8, 9, 10, 11, 14, 15, 16 — module scaffolding, Auth.js config, credentials provider, user lookup functions, session callbacks, `/auth/*` routes, `requireAuth` middleware, cookie config, error handling, logging.
- All of these read/write the same handful of files (`auth.ts`, `config.ts`, `providers.ts`, `adapter.ts`, `session.ts`, `middleware.ts`) with real data dependencies between them (e.g. Step 7's `authorize()` calls Step 8's `findUserByEmail`/`verifyPassword`; Step 15/16 wrap error handling and logging around 7/10/11). Depends on Wave 1 (needs installed packages + real schema/migration).

**Wave 3 — depends on Wave 2's middleware (Step 11) landing, otherwise independent:**

- Step 17 — Protect existing `/api/books` write routes. Touches `books.ts`/`routes/index.ts`, not the auth files, so it _can_ run as a separate agent in parallel with the tail of Wave 2 (steps 14–16) once `requireAuth` exists, without file conflicts.

**Wave 4 — last, after everything:**

- Step 18 — Documentation. Needs the finished implementation to describe accurately; doesn't conflict with any source file, so it's safe to hand to a separate agent, but should start only once Waves 2–3 are done (or it'll document a moving target).

**Net recommendation:** 3 parallel agents for Wave 1, then one agent carries Wave 2 through to completion, optionally peeling off Step 17 to a second agent near the end, then a documentation agent last.

---

## Requirements

Implement authentication using:

- Auth.js
- @auth/express
- Drizzle ORM Adapter
- PostgreSQL
- Secure cookie-based sessions
- Environment-based configuration

The implementation must be modular and production-ready.

---

### Step 1 - Install Dependencies

Install all required packages.

Required packages include:

- @auth/express
- @auth/core
- @auth/drizzle-adapter
- bcrypt (or bcryptjs)
- zod (if not already installed)

Do not install unnecessary authentication libraries.

---

### Step 2 - Verify Existing Database

Inspect the current Drizzle schema.

Determine whether authentication tables already exist.

If they do not exist, create them.

Do not modify unrelated tables.

---

### Step 3 - Create Auth Database Schema

Create the Auth.js tables required by the Drizzle adapter.

These include:

- users
- accounts
- sessions
- verificationTokens

Use the official Auth.js schema as the reference.

Requirements:

- UUID primary keys
- Proper foreign keys
- Cascade deletes where appropriate
- Appropriate indexes
- Timestamp fields

Generate a Drizzle migration.

Do not manually edit SQL unless absolutely necessary.

---

### Step 4 - Apply Database Migration

Generate and execute the migration.

Verify:

- Tables exist
- Foreign keys exist
- Indexes exist

---

### Step 5 - Create Authentication Module

Create a dedicated authentication module.

Suggested structure:

src/
auth/
auth.ts
config.ts
providers.ts
adapter.ts
session.ts
middleware.ts
index.ts

Authentication logic must not be mixed with unrelated application code.

---

### Step 6 - Configure Auth.js

Configure Auth.js using:

- ExpressAuth
- Drizzle Adapter
- Database session strategy
- Secure cookies
- AUTH_SECRET environment variable

Session configuration should be centralized.

---

### Step 7 - Configure Providers

Initially configure:

Credentials Provider

Support:

- email
- password

Password verification must use bcrypt.

Passwords must never be stored or compared in plaintext.

Leave the provider configuration structured so additional OAuth providers can be added later.

---

### Step 8 - Create User Lookup Logic

Implement reusable functions for:

- findUserByEmail()
- findUserById()
- createUser()
- verifyPassword()

These functions should be reusable throughout the application.

---

### Step 9 - Configure Session Callbacks

Configure callbacks so the session contains:

User ID

Email

Name

Role (if available)

Avoid exposing unnecessary database fields.

---

### Step 10 - Register Auth Routes

Register Auth.js routes under:

/auth/\*

Ensure routes include:

/auth/signin

/auth/signout

/auth/session

/auth/callback/\*

---

### Step 11 - Authentication Middleware

Create reusable middleware for protected routes.

Example:

requireAuth()

The middleware should:

Validate the session

Attach the authenticated user to the request

Return HTTP 401 when unauthenticated

Avoid duplicating authentication logic across routes.

---

### Step 12 - Extend Express Types

Extend Express Request typings so authenticated routes can safely access:

req.user

Include proper TypeScript declarations.

No usage of "any".

---

### Step 13 - Environment Variables

Add required configuration.

Examples:

AUTH_SECRET=

AUTH_URL=

DATABASE_URL=

SESSION_MAX_AGE=

COOKIE_DOMAIN=

Ensure secrets are never committed.

Update:

.env.example

---

### Step 14 - Cookie Configuration

Configure cookies for:

Development

Production

Ensure:

httpOnly

sameSite

secure in production

appropriate expiration

---

### Step 15 - Error Handling

Implement authentication error handling.

Requirements:

No sensitive error messages.

Return appropriate HTTP status codes.

Gracefully handle:

invalid credentials

missing session

expired session

database failures

---

### Step 16 - Logging

Authentication events should log:

Successful login

Failed login

Logout

Session expiration

Do not log:

Passwords

Tokens

Secrets

Session cookies

---

### Step 17 - Protect Existing API Routes

Protect existing authenticated endpoints if such exist using the middleware.

Only public endpoints should remain publicly accessible.

---

### Step 18 - Documentation

Create documentation covering:

Authentication architecture

Session flow

Route protection

How to add OAuth providers

Environment variables

Running migrations

Development workflow

---

# Acceptance Criteria

## Dependencies

- All required Auth.js packages are installed.
- No unnecessary authentication libraries exist.

---

## Database

- Auth.js tables exist.
- Migration generated using Drizzle.
- Foreign keys verified.
- Indexes verified.

---

## Configuration

- Auth.js configured correctly.
- Uses Drizzle Adapter.
- Uses PostgreSQL.
- Uses database sessions.
- Uses secure cookies.

---

## Credentials Authentication

- Email/password login works.
- Passwords verified using bcrypt.
- Plaintext passwords are never used.

---

## Session Management

- Session persists correctly.
- Logout destroys the session.
- Expired sessions are rejected.

---

## Middleware

- Protected endpoints require authentication.
- Unauthenticated requests receive HTTP 401.
- Authenticated user is available via req.user.

---

## TypeScript

- No `any` types introduced.
- Express Request typings extended correctly.
- Project compiles without TypeScript errors.

---

## Security

- AUTH_SECRET is required.
- Cookies are HttpOnly.
- Secure cookies enabled in production.
- CSRF protection remains enabled.
- No secrets are logged.

---

## Code Quality

- Authentication code is isolated inside its own module.
- No duplicated authentication logic.
- Functions are reusable.
- Follows existing project structure.

---

## Documentation

Documentation explains:

- Authentication flow
- Session lifecycle
- Route protection
- Adding providers
- Environment configuration
- Database migrations

---

## Final Verification

The following workflow succeeds:

1. Server starts successfully.
2. Database migration completes.
3. User can sign in.
4. Session cookie is created.
5. Authenticated requests succeed.
6. Unauthenticated requests return 401.
7. Sign out destroys the session.
8. Session endpoint returns the current authenticated user.
9. All checks pass, the husky pre-commit checks run on both frontend and backend applications
