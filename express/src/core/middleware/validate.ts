import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { ApiError } from "../http/ApiError.js";

/**
 * Centralised request validation.
 *
 * Controllers previously each re-implemented presence checks (`if (!partyId)`)
 * and produced their own 400 bodies. Declaring a schema per route moves that to
 * the routing table, guarantees one error shape, and hands the controller values
 * that are already trimmed, coerced and typed.
 *
 * `body` and `params` are replaced in place. `query` cannot be: Express 5 defines
 * it as a getter-only property, so assigning to it throws
 * "Cannot set property query of #<IncomingMessage>". Parsed query values are
 * exposed as `req.validatedQuery` instead — read that, not `req.query`, in any
 * handler behind a query schema.
 */

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

function toApiError(error: ZodError): ApiError {
  const details = error.issues.map((issue) => ({
    field: issue.path.join(".") || "(root)",
    message: issue.message,
  }));

  const summary = details.map((detail) => `${detail.field}: ${detail.message}`).join("; ");
  return ApiError.badRequest(summary || "Invalid request", details);
}

export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        req.validatedQuery = schemas.query.parse(req.query) as Record<string, unknown>;
      }
      // `req.body` is undefined when no JSON body was sent; parse `{}` instead so
      // a schema of all-optional fields still succeeds.
      if (schemas.body) {
        req.body = schemas.body.parse(req.body ?? {});
      }
      next();
    } catch (error) {
      next(error instanceof ZodError ? toApiError(error) : error);
    }
  };
}

/**
 * Typed accessor for the parsed query. Throws if the route forgot its schema,
 * which surfaces the wiring mistake instead of handing the controller undefined
 * and letting it fail further down as a confusing database error.
 */
export function validatedQuery<T>(req: Request): T {
  if (!req.validatedQuery) {
    throw ApiError.internal("Route is missing a query validation schema");
  }
  return req.validatedQuery as T;
}

declare global {
  namespace Express {
    interface Request {
      /** Set by `validate({ query })`. Express 5 makes `req.query` read-only. */
      validatedQuery?: Record<string, unknown>;
    }
  }
}
