import type { Provider } from "@auth/express/providers";
import Credentials from "@auth/express/providers/credentials";
import { CredentialsSignin } from "@auth/express";
import { z } from "zod";
import { findUserByEmail, verifyPassword } from "@/auth/users";

/**
 * Thrown by `authorize()` for every failure case (unknown email, wrong
 * password, malformed input, DB error). Deliberately generic per Auth.js's
 * own `CredentialsSignin` guidance — never hints whether the email or the
 * password was the problem.
 */
class InvalidCredentialsError extends CredentialsSignin {
  code = "credentials";
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Structured as an array so additional providers (e.g. OAuth) can be
 * appended later without touching the Credentials config.
 */
export const providers: Provider[] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(rawCredentials) {
      const parsed = credentialsSchema.safeParse(rawCredentials);
      if (!parsed.success) {
        console.warn("🔒 Login failed: malformed credentials payload");
        throw new InvalidCredentialsError();
      }
      const { email, password } = parsed.data;

      let user;
      try {
        user = await findUserByEmail(email);
      } catch (err) {
        console.error(
          "🔥 Login failed: database error while looking up user",
          err instanceof Error ? err.message : err,
        );
        throw new InvalidCredentialsError();
      }

      if (!user || !user.password) {
        console.warn(`🔒 Login failed for ${email}: invalid credentials`);
        throw new InvalidCredentialsError();
      }

      const passwordMatches = await verifyPassword(password, user.password);
      if (!passwordMatches) {
        console.warn(`🔒 Login failed for ${email}: invalid credentials`);
        throw new InvalidCredentialsError();
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    },
  }),
];
