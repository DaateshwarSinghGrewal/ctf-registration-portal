# Somnium Portal

A React + Vite reconstruction of the "Somnium" Figma file: a CCS-presented
capture-the-flag event site with a Google-authenticated team registration
flow.

## Screens

- **Website** (`/`) — the marketing landing page: hero countdown, CTF
  explainer, game narrative, theme timeline, demo video, registration
  teaser, sponsors, and contact section, all on one scrollable route.
- **Google Auth** (`/auth`) — Google sign-in gate, reached from the
  Website's "Register Now" actions.
- **Team Management** (`/team`) — post-sign-in landing screen with
  "Create Team" and "Join Team" actions.
- **Create Team** (`/team/create`) / **Join Team** (`/team/join`) —
  terminal screens for each Team Management action.

The Website's nav bar links (`About`, `Sponsors`, `Info`) scroll to
in-page sections rather than changing routes; only `Register Now`
navigates to a different screen.

## Getting started

The frontend and the Express API run as two processes.

```bash
# 1. API (terminal 1)
cd express
npm install
cp .env.example .env       # fill in DATABASE_URL, Google creds, JWT_SECRET
npm run dev                # http://localhost:3000

# 2. Frontend (terminal 2)
cd client
npm install
cp .env.example .env       # VITE_API_URL=http://localhost:3000
npm run dev                # http://localhost:5173
```

The shared database layer lives in `shared/db/` and has its own
dependencies — run `npm install` there once, and `npx tsx migrate.ts` to
apply `schema.sql` to Neon.

Redis is used by the flag-submission rate limiter; the API starts without
it, but logs connection errors until one is reachable.

## Google Sign-In setup

The OAuth round trip is handled entirely by the backend — the browser
never sees the client secret and never talks to Google directly.

1. Create an OAuth 2.0 Client ID in the Google Cloud Console (Web
   application type).
2. Add `http://localhost:3000/auth/google/callback` as an authorized
   redirect URI (it must match `GOOGLE_REDIRECT_URI` verbatim).
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
   `GOOGLE_REDIRECT_URI` in `express/.env`.

Flow: the sign-in button navigates to `GET /auth/google` → Google →
`GET /auth/google/callback`, which upserts the user in Neon, signs a JWT,
sets it as an httpOnly cookie, and redirects to `/team`. The frontend
reads the session back via `GET /auth/me`, so it survives a refresh and
there is no token in browser storage.

## API layer

All backend calls go through `client/src/api/` — `client.js` holds the single
fetch instance (base URL, credentials, timeout, error normalisation), with
`auth.js` and `party.js` wrapping the endpoints. No component calls
`fetch` directly.

## Assets

Place referenced images/fonts under `client/public/assets/`:

- `client/public/assets/images/` — hero art, about/register photos, sponsor
  logos, demo video poster
- `client/public/assets/videos/` — demo video file
- `client/public/assets/fonts/` — self-hosted `AmstelvarAlpha` variable font
  (all other typefaces load from Google Fonts in `client/index.html`)

## Scripts (from `client/`)

- `npm run dev` — start the Vite dev server
- `npm run build` — production build to `client/dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint