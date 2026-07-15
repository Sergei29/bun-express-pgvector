import type { ExpressAuthConfig } from "@auth/express";
import type { Request } from "express";
import "@/auth/types";
import { authAdapter } from "@/auth/adapter";
import { providers } from "@/auth/providers";

// AUTH_SECRET is required — fail fast at startup rather than letting
// Auth.js silently fall back to an undefined secret (which would make
// every issued session/CSRF token forgeable).
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  throw new Error(
    "AUTH_SECRET environment variable is required. Generate one with: openssl rand -base64 33",
  );
}

const AUTH_URL = process.env.AUTH_URL;
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE ?? 2592000); // 30 days
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

/**
 * Use secure (`https`-only, `__Secure-`/`__Host-` prefixed) cookies in
 * production, or whenever the configured AUTH_URL is itself https — mirrors
 * Auth.js's own default heuristic (https://... => secure cookies) so local
 * development against `http://localhost:8080` keeps working.
 */
export const useSecureCookies =
  process.env.NODE_ENV === "production" ||
  (AUTH_URL?.startsWith("https://") ?? false);

const cookiePrefix = useSecureCookies ? "__Secure-" : "";
/** Matches Auth.js's own internal cookie-naming formula (see @auth/core cookie.ts). */
export const sessionCookieName = `${cookiePrefix}authjs.session-token`;

/** True if the request carries a (possibly invalid/expired) session cookie. */
export function hasSessionCookie(req: Request): boolean {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return false;
  return cookieHeader
    .split(";")
    .some((part) => part.trim().startsWith(`${sessionCookieName}=`));
}

export const authConfig: ExpressAuthConfig = {
  adapter: authAdapter,
  providers,
  secret: AUTH_SECRET,
  trustHost: true,
  useSecureCookies,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: useSecureCookies,
        domain: COOKIE_DOMAIN,
      },
    },
  },
  callbacks: {
    // Runs at sign-in (and on every subsequent request to refresh the JWT).
    // `user` is only defined on the initial sign-in call — copy the fields
    // we want to persist in the encrypted JWT onto the token here.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? null;
      }
      return token;
    },
    // Controls what's exposed to the client via GET /auth/session.
    // Only id/email/name/role are surfaced — never the password hash or
    // other raw DB columns.
    async session({ session, token }) {
      session.user.id = token.id ?? token.sub ?? "";
      session.user.role = token.role ?? null;
      return session;
    },
  },
  events: {
    // authorize() throwing prevents this from firing on failed logins —
    // failed-login logging happens inside authorize() itself (providers.ts),
    // since only there do we know *why* it failed.
    async signIn({ user }) {
      console.log(`✅ Login succeeded for user ${user.id ?? "unknown"}`);
    },
    async signOut(message) {
      const userId = "token" in message ? message.token?.id : undefined;
      console.log(`👋 Logout${userId ? ` for user ${userId}` : ""}`);
    },
  },
};
