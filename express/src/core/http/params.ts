import type { Request } from "express";
import { ApiError } from "./ApiError.js";

/**
 * Reads a path parameter as a string.
 *
 * Express 5 types `req.params` values as `string | string[]` because a route can
 * declare a repeated parameter. None of ours do, but the type is honest and the
 * check is not ceremonial: reaching a handler with an array here means the route
 * pattern and the handler disagree, and passing it on would put an array where a
 * UUID is expected and produce a confusing database error instead of a clear 400.
 */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];

  if (typeof value !== "string" || value.length === 0) {
    throw ApiError.badRequest(`Missing or invalid path parameter: ${name}`);
  }

  return value;
}
