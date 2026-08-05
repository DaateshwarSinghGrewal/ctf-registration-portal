import { createServer } from "node:http";
import type { Server as SocketServer } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./core/logger.js";
import { assertDatabaseReachable, closePool } from "./database/pool.js";
import { closeRedis } from "./database/redis.js";
import { registerChannel } from "./modules/notification/notification.service.js";
import { SocketNotificationChannel } from "./realtime/notification.channel.js";
import { closeSocketServer, createSocketServer } from "./realtime/socket.server.js";

/**
 * Composition root.
 *
 * Everything the app needs is wired here — notably the notification channels, so
 * the notification service never has to know that Socket.IO exists.
 */
export async function startServer(): Promise<void> {
  // Verified before the port is bound: the previous version fired this off
  // unawaited and only logged, so a misconfigured database produced a server
  // that accepted traffic and failed every request.
  await assertDatabaseReachable();

  const app = createApp();
  const httpServer = createServer(app);

  const io = createSocketServer(httpServer);
  registerChannel(new SocketNotificationChannel());

  httpServer.listen(env.port, () => {
    logger.info(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    logger.info(`CORS origins: ${env.frontendUrls.join(", ")}`);
    if (env.adminEmails.length === 0) {
      // Worth saying out loud: with no allow-list, /admin/* is unreachable by
      // anyone, and the symptom is a confusing 403 for a legitimate admin.
      logger.warn("ADMIN_EMAILS is empty — no account can access /admin routes");
    }
  });

  installShutdownHandlers(httpServer, io);
}

/**
 * Graceful shutdown.
 *
 * A restart mid-request would otherwise drop it, and an unclosed pool leaves
 * Neon holding connections until they time out. SIGTERM is what a host sends on
 * deploy; SIGINT is Ctrl-C.
 */
function installShutdownHandlers(
  httpServer: ReturnType<typeof createServer>,
  io: SocketServer
): void {
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    // A second Ctrl-C must not start a parallel teardown.
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`${signal} received — shutting down`);

    // Sockets first: closing the HTTP server waits for open connections, and a
    // websocket never closes on its own.
    await closeSocketServer(io).catch((error: unknown) =>
      logger.warn("Error closing socket server", error)
    );

    httpServer.close(() => {
      void Promise.allSettled([closePool(), closeRedis()]).then(() => {
        logger.info("Shutdown complete");
        process.exit(0);
      });
    });

    // Backstop: if a connection refuses to drain, exit anyway rather than
    // hanging the deploy indefinitely.
    setTimeout(() => {
      logger.warn("Forcing exit after shutdown timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  /**
   * A rejection with no handler leaves the process in an unknown state. Logged
   * rather than swallowed — the alternative is a server that keeps running while
   * quietly broken.
   */
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", reason);
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception — exiting", error);
    process.exit(1);
  });
}
