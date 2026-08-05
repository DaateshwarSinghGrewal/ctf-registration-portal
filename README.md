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
npm run migrate            # apply database migrations
npm run dev                # http://localhost:3000

# 2. Frontend (terminal 2)
cd client
npm install
cp .env.example .env       # VITE_API_URL=http://localhost:3000
npm run dev                # http://localhost:5173
```

One `npm install` in `express/` is all the API needs. The database layer
used to live in a separate `shared/db/` package with its own
dependencies, which meant two installs — and because `express/src`
imported across the package boundary, installing only one of them left
the server unable to start at all. It is now `express/src/database/`.

The schema is managed by forward-only migrations in
`src/database/migrations/`. `npm run migrate` applies whatever has not
run yet and records it in `schema_migrations`; it is safe to re-run.

Redis is optional. Without `REDIS_URL` the API rate-limits in memory and
Socket.IO stays single-node — both correct for one instance. Set it
before running more than one, or a team's realtime events will reach
only the members connected to the same process.

### Backend scripts (from `express/`)

- `npm run dev` — watch mode
- `npm run build` — compile to `dist/` (and copy migrations)
- `npm start` — run the build
- `npm run typecheck` — types only, no emit
- `npm run migrate` / `npm run migrate:prod` — apply migrations
- `node scripts/smoke.mjs` — end-to-end check against a running API
  (REST + real Socket.IO client; creates and removes its own test data)

See [`express/API_ENDPOINTS.md`](express/API_ENDPOINTS.md) for the full
endpoint, socket-event and schema reference.

## Google Sign-In setup

The OAuth round trip is handled entirely by the backend — the browser
never sees the client secret and never talks to Google directly.

1. Create an OAuth 2.0 Client ID in the Google Cloud Console (Web
   application type).
2. Add `http://localhost:3000/auth/google/callback` as an authorized
   redirect URI (it must match `GOOGLE_REDIRECT_URI` verbatim).
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
   `GOOGLE_REDIRECT_URI` in `express/.env`.

4. Add your own Google account email to `ADMIN_EMAILS` in `express/.env`
   if you need the `/admin` routes — every account is a `PLAYER`
   otherwise, and nothing else grants admin.

Flow: the sign-in button navigates to `GET /auth/google` → Google →
`GET /auth/google/callback`, which upserts the user in Neon, signs a JWT,
sets it as an httpOnly cookie, and redirects to `/team`. The frontend
reads the session back via `GET /auth/me`, so it survives a refresh and
there is no token in browser storage.

The round trip carries a `state` nonce held in a short-lived httpOnly
cookie, so the callback rejects a code it did not ask for. If sign-in
fails — denied consent, an expired nonce — the browser lands on the
SPA's `/auth?error=…`, never back on `/auth/google`.

## API layer

All backend calls go through `client/src/api/` — `client.js` holds the single
fetch instance (base URL, credentials, timeout, error normalisation), with
`auth.js`, `party.js` and `profile.js` wrapping the endpoints. No component
calls `fetch` directly.

Nothing in the client invents data. Team names, invite codes and rosters all
come from the API — Team Management previously generated codes locally and
rendered a fixed member list, so two people holding the same code saw
different teams.

## Realtime

`client/src/realtime/` owns one Socket.IO connection for the whole app,
opened when the user signs in and closed on sign-out. It authenticates with
the same httpOnly cookie as the REST API, so there is no second token.

`useTeam()` (`client/src/hooks/useTeam.js`) is the only owner of team state:
it reads `GET /party/me`, then applies server events. Membership events carry
the full roster, so it is replaced rather than patched — a client that missed
an event during a reconnect self-corrects on the next one.

The result is that a join, a kick, a rename, a leadership change or a disband
appears on every member's screen without a reload.

## Tests

Two suites, both run against a live API (from `express/`):

- `npm run test:api` — 69 assertions over the REST surface and a real
  Socket.IO client: auth, profile gating, the private-team request flow,
  every leader action, notifications, admin, the registration gate.
- `npm run test:ui` — drives the real React app in two browser contexts with
  Playwright and asserts that one user's action shows up on the other user's
  screen. Needs the Vite dev server running too.

Both create and remove their own users and teams.

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