import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import cookieParser from "cookie-parser";
import { env } from "../config/env.js";
import { logger } from "../core/logger.js";
import { TOKEN_COOKIE } from "../core/middleware/authenticateUser.js";
import { redis } from "../database/redis.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { findPartyByMember } from "../modules/party/party.repository.js";
import type { JwtPayload } from "../modules/auth/auth.types.js";
import { attachSocketServer, detachSocketServer, emitPresence } from "./socket.emitter.js";
import { partyRoom, userRoom } from "./socket.rooms.js";

/**
 * Socket.IO server.
 *
 * Authenticated with the same httpOnly JWT cookie as the REST API — the browser
 * sends it on the handshake automatically, so there is no second token to issue
 * and no way for a socket to be authenticated when the API would not be.
 *
 * Connections are read-only: no state-changing client events are accepted (see
 * socket.events.ts). Mutations go through REST, which owns validation,
 * authorisation and the audit trail; the socket only reports what happened.
 */

declare module "socket.io" {
  /**
   * Claims live on `socket.data`, not a custom property, because `data` is the
   * only per-socket state that survives `fetchSockets()` — including across
   * instances under the Redis adapter, which is what presence reads.
   */
  interface SocketData {
    auth: JwtPayload;
  }
}

/**
 * Sockets currently connected per user.
 *
 * A count, not a boolean: a user with two tabs open produces two sockets, and
 * treating the first disconnect as "went offline" would flicker their presence
 * off while they are still there.
 */
const connectionsByUser = new Map<string, number>();

function trackConnect(userId: string): boolean {
  const next = (connectionsByUser.get(userId) ?? 0) + 1;
  connectionsByUser.set(userId, next);
  return next === 1;
}

function trackDisconnect(userId: string): boolean {
  const next = (connectionsByUser.get(userId) ?? 1) - 1;
  if (next <= 0) {
    connectionsByUser.delete(userId);
    return true;
  }
  connectionsByUser.set(userId, next);
  return false;
}

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    // Same allow-list as the REST CORS config; credentials are required because
    // authentication rides on a cookie.
    cors: { origin: env.frontendUrls, credentials: true },
    // Sockets push small state deltas. A large frame means something is wrong,
    // and an unbounded one is a memory-exhaustion vector.
    maxHttpBufferSize: 1e6,
  });

  /**
   * With Redis, a broadcast from one instance reaches clients connected to the
   * others. Without it `emitToParty` only reaches sockets on this process — so
   * running more than one instance would deliver a team's events to only some of
   * its members.
   */
  if (redis) {
    io.adapter(createAdapter(redis, redis.duplicate()));
    logger.info("Socket.IO using Redis adapter (multi-instance broadcast)");
  }

  // The very same parser the REST app uses, so the handshake cannot disagree with
  // an HTTP request about what the cookie header means.
  io.engine.use(cookieParser());

  io.use((socket, next) => {
    const cookies = (socket.request as { cookies?: Record<string, string> }).cookies;
    const token = cookies?.[TOKEN_COOKIE];

    if (!token) {
      next(new Error("Authentication required"));
      return;
    }

    try {
      socket.data.auth = verifyAccessToken(token);
      next();
    } catch {
      next(new Error("Invalid or expired session"));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket.data.auth;
    logger.debug(`socket connected: ${userId}`);

    // Joined unconditionally: this is how a targeted notification reaches a user
    // who is not in any team room.
    void socket.join(userRoom(userId));

    if (trackConnect(userId)) {
      logger.debug(`user online: ${userId}`);
    }

    /**
     * The team room is derived from the database, never from anything the client
     * says. Letting a client name its own room would let any authenticated user
     * subscribe to any team's private events by guessing a six-character code.
     */
    void (async () => {
      try {
        const party = await findPartyByMember(userId);
        if (!party) return;

        await socket.join(partyRoom(party.id));
        await emitPresence(party.id);

        socket.on("disconnect", () => {
          // The socket has already left the room by now, so this just tells the
          // remaining members.
          void emitPresence(party.id).catch(() => undefined);
        });
      } catch (error) {
        logger.warn(`Could not resolve team room for ${userId}`, error);
      }
    })();

    socket.on("disconnect", (reason) => {
      if (trackDisconnect(userId)) {
        logger.debug(`user offline: ${userId} (${reason})`);
      }
    });
  });

  attachSocketServer(io);
  return io;
}

export async function closeSocketServer(io: Server): Promise<void> {
  detachSocketServer();
  connectionsByUser.clear();
  await io.close();
}
