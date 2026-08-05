import type { NextFunction, Request, Response } from "express";
import { ApiError, ErrorCode } from "../http/ApiError.js";
import { fail } from "../http/respond.js";
import { env } from "../../config/env.js";
import { logger } from "../logger.js";

/**
 * Terminal error middleware. Every failure response in the API is produced
 * here, which is what keeps the envelope consistent and stops an unexpected
 * throw from returning Express's default HTML error page.
 *
 * Deliberate (ApiError) failures are logged at debug level — a 404 or a wrong
 * party password is normal traffic, not an incident. Anything else is a bug:
 * it is logged with its stack and reported as a generic 500, so internal
 * details (SQL text, connection strings) never reach the client.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Headers already flushed — the only correct move is to abort the socket.
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    logger.debug(`${req.method} ${req.originalUrl} → ${error.status} ${error.message}`);
    fail(res, error.status, error.code, error.message, error.details);
    return;
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, error);

  fail(
    res,
    500,
    ErrorCode.INTERNAL,
    "The server ran into a problem. Please try again shortly.",
    // A stack is a debugging aid in development and an information leak in
    // production, so it is attached only outside production.
    env.isProduction ? undefined : { stack: (error as Error)?.stack }
  );
}
