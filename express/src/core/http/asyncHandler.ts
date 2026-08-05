import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Forwards a rejected promise to Express's error pipeline.
 *
 * Express 5 already awaits handler promises, but it does NOT await a handler
 * that returns a non-promise while doing async work, and the behaviour is easy
 * to lose on an accidental signature change. Wrapping makes async safety
 * explicit and uniform, so no route can silently hang on a rejection.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
