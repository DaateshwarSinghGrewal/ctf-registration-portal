import type { NextFunction, Request, RequestHandler, Response } from "express";
import { Role } from "../../modules/auth/auth.types.js";
import { ApiError } from "../http/ApiError.js";

/**
 * Role gate. Must be mounted after `authenticateUser`, which is what puts the
 * verified claims on the request.
 *
 * `requirePlayer` was removed along with the previous `requireRole(PLAYER)`
 * helper: it read as "players only" and would have rejected an admin from any
 * route it guarded. Authentication alone is the correct gate for player
 * routes, and admins are players too.
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized("Authentication required"));
      return;
    }

    if (!allowed.includes(req.user.role)) {
      next(ApiError.forbidden("Insufficient permissions"));
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole(Role.ADMIN);
