/**
 * Minimal levelled logger.
 *
 * Exists so no module has to reach for `console.log` directly: log calls were
 * previously scattered across the db pool, the redis client and every
 * controller's catch block, with no way to quiet them. A dependency-free
 * wrapper is enough here — structured/shipped logs are a deployment concern,
 * and this keeps the seam to swap in pino later without touching call sites.
 *
 * LOG_LEVEL overrides the default (debug outside production, info in it).
 */

const LEVELS = ["debug", "info", "warn", "error", "silent"] as const;
type Level = (typeof LEVELS)[number];

function resolveLevel(): Level {
  const configured = process.env.LOG_LEVEL as Level | undefined;
  if (configured && LEVELS.includes(configured)) return configured;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const threshold = LEVELS.indexOf(resolveLevel());

function enabled(level: Level): boolean {
  return LEVELS.indexOf(level) >= threshold;
}

export const logger = {
  debug(message: string, ...rest: unknown[]): void {
    if (enabled("debug")) console.debug(`[debug] ${message}`, ...rest);
  },
  info(message: string, ...rest: unknown[]): void {
    if (enabled("info")) console.info(`[info]  ${message}`, ...rest);
  },
  warn(message: string, ...rest: unknown[]): void {
    if (enabled("warn")) console.warn(`[warn]  ${message}`, ...rest);
  },
  error(message: string, ...rest: unknown[]): void {
    if (enabled("error")) console.error(`[error] ${message}`, ...rest);
  },
};
