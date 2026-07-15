export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
