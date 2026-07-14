import { ExpressAuth } from "@auth/express";
import { authConfig } from "@/auth/config";

/**
 * Express request handler implementing Auth.js's native REST protocol under
 * whatever path it's mounted at (see app.ts, mounted at `/auth/*`):
 *   GET  /auth/csrf
 *   GET  /auth/providers
 *   GET  /auth/session
 *   POST /auth/signin/:provider
 *   POST /auth/callback/:provider
 *   POST /auth/signout
 */
export const authHandler = ExpressAuth(authConfig);
