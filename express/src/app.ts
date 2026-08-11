import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env, isOriginAllowed } from "./config/env.js";
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
import { createRateLimiter } from "./core/middleware/rateLimiter.js";

const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  keyPrefix: "global",
});
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

  // Security headers: HSTS, X-Content-Type-Options, X-Frame-Options,
  // Referrer-Policy, and hides X-Powered-By. CSP is left to the SPA — this
  // API only returns JSON, so a restrictive default-src here would not protect
  // the page the user actually sees.
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  // The SPA is on a different origin and authenticates with a cookie, so the
  // browser needs both an explicit origin and credentials. A callback rather
  // than a fixed list so development tolerates Vite changing its port — see
  // isOriginAllowed.
  app.use(
    cors({
      origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
      credentials: true,
    })
  );

  // Bounded: the largest legitimate request here is a profile form.
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(passport.initialize()); // Stateless — no passport.session().

  /** Liveness probe for the host platform. Deliberately unauthenticated. */
  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, message: "OK", data: { status: "up" } });
  });

  app.use(globalLimiter);

  // Public: the landing page shows registration state before anyone signs in.
  app.get("/event/status", asyncHandler(getStatus));

  // TODO: Remove this temporary route after making yourself an admin!
  app.get("/make-me-admin", async (req, res) => {
    const email = req.query.email;
    if (!email) return res.send("Please provide an email: /make-me-admin?email=you@example.com");
    try {
      const { pool } = await import("./database/pool.js");
      const result = await pool.query("UPDATE user_auth SET role = 'ADMIN' WHERE email = $1 RETURNING *", [email]);
      res.json({ message: "Done!", updated: result.rows });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.use("/auth", authRouter);
  app.use("/admin", adminRouter);

  // One `authenticateUser` per subtree rather than per route: a new route under
  // these is then protected by default.
  app.use("/profile", authenticateUser, profileRouter);
  app.use("/party", authenticateUser, partyRouter);
  app.use("/join-requests", authenticateUser, joinRequestRouter);
  app.use("/notifications", authenticateUser, notificationRouter);
  
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
