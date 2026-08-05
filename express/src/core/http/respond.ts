import type { Response } from "express";
import type { ErrorCode } from "./ApiError.js";

/**
 * The one response envelope for every endpoint.
 *
 * Failures carry BOTH `message` and `error`: the existing SPA reads
 * `payload.message ?? payload.error` (client/src/api/client.js), and older
 * auth/admin responses used `error` alone. Sending both keeps every current
 * caller working while new code can rely on `message`.
 */

interface SuccessBody<T> {
  success: true;
  message: string;
  data: T;
}

interface FailureBody {
  success: false;
  message: string;
  error: { code: ErrorCode; details?: unknown };
}

export function ok<T>(res: Response, data: T, message = "OK"): void {
  const body: SuccessBody<T> = { success: true, message, data };
  res.status(200).json(body);
}

export function created<T>(res: Response, data: T, message = "Created"): void {
  const body: SuccessBody<T> = { success: true, message, data };
  res.status(201).json(body);
}

export function fail(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown
): void {
  const body: FailureBody = {
    success: false,
    message,
    error: details === undefined ? { code } : { code, details },
  };
  res.status(status).json(body);
}
