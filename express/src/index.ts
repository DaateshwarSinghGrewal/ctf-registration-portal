/**
 * Entry point.
 *
 * `./config/env.js` must be imported first: it loads .env and validates it
 * before any module that reads process.env at import time — the database pool,
 * the redis client, the passport strategy — gets a chance to see an empty value
 * and fail obscurely later.
 */
import "./config/env.js";

import { logger } from "./core/logger.js";
import { startServer } from "./server.js";

startServer().catch((error: unknown) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
