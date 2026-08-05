import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./config/env.js";
import passport from "./config/passport.js";
import { asyncHandler } from "./core/http/asyncHandler.js";
import { authenticateUser } from "./core/middleware/authenticateUser.js";
import { errorHandler } from "./core/middleware/errorHandler.js";
import { notFound } from "./core/middleware/notFound.js";
import authRouter from "./modules/auth/auth.routes.js";
import adminRouter from "./modules/admin/admin.routes.js";
import partyRouter from "./modules/party/party.routes.js";
import joinRequestRouter from "./modules/joinRequest/joinRequest.routes.js";
import profileRouter from "./modules/profile/profile.routes.js";
import notificationRouter from "./modules/notification/notification.routes.js";
import { getStatus } from "./modules/event/event.controller.js";

/**
 * Builds the Express application.
 *
 * Separate from server.ts so the app can be constructed without binding a port
 * or standing up a websocket server — which is what makes it testable.
 */
export function createApp(): Express {
  const app = express();

  // Hosting platforms terminate TLS at a proxy and forward over plain HTTP.
  // Without this Express sees an insecure request and refuses to send the Secure
  // session cookie — and req.ip would be the proxy's address, which would make
  // every user share one rate-limit bucket.
  app.set("trust proxy", 1);

  // The API returns JSON to a SPA, never HTML, so there is nothing for this
  // header to advertise but the server implementation.
  app.disable("x-powered-by");

  // The SPA is on a different origin and authenticates with a cookie, so the
  // browser needs both an explicit origin and credentials.
  app.use(cors({ origin: env.frontendUrls, credentials: true }));

  // Bounded: the largest legitimate request here is a profile form.
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(passport.initialize()); // Stateless — no passport.session().

  /** Liveness probe for the host platform. Deliberately unauthenticated. */
  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, message: "OK", data: { status: "up" } });
  });

  // Public: the landing page shows registration state before anyone signs in.
  app.get("/event/status", asyncHandler(getStatus));

  app.use("/auth", authRouter);
  app.use("/admin", adminRouter);

  // One `authenticateUser` per subtree rather than per route: a new route under
  // these is then protected by default.
  app.use("/profile", authenticateUser, profileRouter);
  app.use("/party", authenticateUser, partyRouter);
  app.use("/join-requests", authenticateUser, joinRequestRouter);
  app.use("/notifications", authenticateUser, notificationRouter);

  // Order matters: notFound must follow every route, and errorHandler must be
  // last so it receives what they pass to next().
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
