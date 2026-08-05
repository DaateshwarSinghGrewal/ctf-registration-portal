import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../http/ApiError.js";

/**
 * Converts an unmatched route into an ApiError so the 404 goes through
 * errorHandler and arrives in the same envelope as every other failure,
 * rather than Express's default HTML "Cannot GET /x" page.
 */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}
