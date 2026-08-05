import { Router, type NextFunction, type Request, type Response } from "express";
import passport from "../../config/passport.js";
import { asyncHandler } from "../../core/http/asyncHandler.js";
import { authenticateUser } from "../../core/middleware/authenticateUser.js";
import { issueOAuthState, verifyOAuthState } from "../../core/middleware/oauthState.js";
import { createRateLimiter } from "../../core/middleware/rateLimiter.js";
import { googleCallback, logout, me, redirectWithError } from "./auth.controller.js";

const router = Router();

/**
 * Caps how often one IP can start an OAuth round trip. Each attempt costs a
 * token request against Google's quota, so an unthrottled loop is a cheap way to
 * exhaust it for everyone.
 */
const signInLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  keyPrefix: "auth",
  message: "Too many sign-in attempts. Please wait a minute.",
});

/**
 * Step 1 — hand the browser to Google.
 *
 * `issueOAuthState` sets the CSRF nonce, which is then passed to Passport as the
 * `state` parameter for Google to echo back.
 */
router.get(
  "/google",
  signInLimiter,
  issueOAuthState,
  (req: Request, res: Response, next: NextFunction) =>
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
      state: req.oauthState,
    })(req, res, next)
);

/**
 * Step 2 — Google returns here with a code.
 *
 * `failureRedirect` deliberately does NOT point at /auth/google. It used to,
 * which meant a denied consent bounced straight back into a fresh OAuth attempt
 * — a redirect loop on the API origin, with no way for the user to escape or see
 * what went wrong. Failures now land on the SPA's /auth with an ?error= the page
 * already knows how to render.
 */
router.get(
  "/google/callback",
  verifyOAuthState(redirectWithError),
  (req: Request, res: Response, next: NextFunction) => {
    // The custom-callback form is used so both outcomes are handled explicitly.
    // Without it, a failure with no `failureRedirect` makes Passport send a bare
    // 401 to a browser that is mid-navigation — the user sees "Unauthorized" as
    // plain text on the API's domain.
    passport.authenticate(
      "google",
      { session: false },
      (error: unknown, user: Express.User | false | null) => {
        if (error || !user) {
          redirectWithError(req, res, "Google sign-in was cancelled or failed.");
          return;
        }
        req.user = user;
        next();
      }
    )(req, res, next);
  },
  asyncHandler(googleCallback)
);

router.post("/logout", authenticateUser, logout);

router.get("/me", authenticateUser, asyncHandler(me));

export default router;
