import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env.js";
import type { GoogleProfile } from "../modules/auth/auth.types.js";

/**
 * Google OAuth strategy.
 *
 * The verify callback only normalises the profile — it does no database work.
 * Persistence belongs to the controller, so a failed upsert produces a
 * redirect the SPA can render rather than a Passport failure that lands on
 * `failureRedirect`.
 *
 * There is no serializeUser/deserializeUser pair and no passport.session():
 * every route is authenticated by JWT cookie, so sessions would add a store to
 * maintain for no benefit. The previous pair was dead code — under
 * `session: false` Passport never calls it.
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.redirectUri,
      scope: ["profile", "email"],
      // CSRF protection for the callback is the `state` nonce, but Passport's
      // built-in `state: true` requires a session store. It is implemented
      // statelessly instead — see core/middleware/oauthState.ts — so no
      // session middleware or session store is needed.
    },
    (_accessToken, _refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value;

      if (!email) {
        done(new Error("Google account has no email address"));
        return;
      }

      const normalised: GoogleProfile = {
        googleId: profile.id,
        email: email.toLowerCase(),
      };

      // Express.User is the app-wide authenticated identity (JwtPayload). At this
      // point in the flow there is no user yet — only a verified Google profile,
      // which auth.controller exchanges for one. Passport has a single User type
      // for both stages, so the narrowing is asserted here rather than widening
      // Express.User and losing `req.user.userId` everywhere else.
      done(null, normalised as unknown as Express.User);
    }
  )
);

export default passport;
