/**
 * The single error type the HTTP layer understands.
 *
 * Services throw these instead of returning error tuples, so a handler only
 * has to describe the happy path — `errorHandler` converts anything thrown
 * into a response. An error that is *not* an ApiError is treated as a bug and
 * reported as 500 without leaking its message to the client.
 */

export const enum ErrorCode {
  VALIDATION = "VALIDATION_ERROR",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL = "INTERNAL_ERROR",
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  /** Field-level detail, surfaced only for validation failures. */
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, ErrorCode.VALIDATION, message, details);
  }

  static unauthorized(message = "Authentication required"): ApiError {
    return new ApiError(401, ErrorCode.UNAUTHENTICATED, message);
  }

  static forbidden(message = "You do not have permission to do that"): ApiError {
    return new ApiError(403, ErrorCode.FORBIDDEN, message);
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, ErrorCode.NOT_FOUND, message);
  }

  /** Duplicate or state conflict — e.g. joining a party twice, a full party. */
  static conflict(message: string): ApiError {
    return new ApiError(409, ErrorCode.CONFLICT, message);
  }

  static tooManyRequests(message: string): ApiError {
    return new ApiError(429, ErrorCode.RATE_LIMITED, message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, ErrorCode.INTERNAL, message);
  }
}
