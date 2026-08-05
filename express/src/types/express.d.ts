import type { JwtPayload } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    /**
     * Populated by `authenticateUser` from the verified JWT, and by Passport
     * during the OAuth callback. Any route behind `authenticateUser` can treat
     * `req.user` as present.
     */
    interface User extends JwtPayload {}
  }
}
