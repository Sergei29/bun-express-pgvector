// Module augmentation: extends Auth.js's own types to include the extra
// `id`/`role` fields we carry through the JWT and expose on the session,
// following the pattern documented at
// https://authjs.dev/getting-started/typescript#module-augmentation
import type { DefaultSession } from "@auth/core/types";

declare module "@auth/core/types" {
  export interface User {
    /** Present on the object returned by the Credentials provider's `authorize()`. */
    role?: string | null;
  }

  export interface Session {
    user: {
      id: string;
      role: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  export interface JWT {
    /** Copied from `User.id` in the `jwt` callback at sign-in. */
    id?: string;
    /** Copied from `User.role` in the `jwt` callback at sign-in. */
    role?: string | null;
  }
}

export {};
