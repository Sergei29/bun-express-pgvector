import type { Request, Response, NextFunction } from "express";
import { getSession } from "@auth/express";
import { authConfig, hasSessionCookie } from "@/auth/config";
import type { AuthUser } from "@/types/express";

/**
 * Protects a route/router: validates the Auth.js session, attaches the
 * authenticated user to `req.user`, and calls `next()`. Responds with a
 * generic 401 (no leaked internals) whenever the session is missing,
 * expired, or invalid, and never throws/crashes the process on DB or
 * decode failures.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let session;
  try {
    session = await getSession(req, authConfig);
  } catch (err) {
    // DB failure, malformed request, etc — never leak details to the client.
    console.error(
      "🔥 requireAuth: failed to resolve session:",
      err instanceof Error ? err.message : err,
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!session?.user?.id) {
    // A session cookie was present but didn't decode to a valid session:
    // distinguish "expired/invalid session" from simply "no session cookie
    // at all" for logging purposes (both still result in a 401).
    if (hasSessionCookie(req)) {
      console.warn(
        "⚠️ requireAuth: session cookie present but session is invalid or expired",
      );
    }
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user: AuthUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    role: session.user.role ?? null,
  };

  req.user = user;
  next();
}
