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

```bash
npm install
cp .env.example .env
# edit .env with your Google OAuth client ID and redirect URI
npm run dev
```

## Google Sign-In setup

1. Create an OAuth 2.0 Client ID in the Google Cloud Console (Web
   application type).
2. Add your dev and production URLs (e.g. `http://localhost:5173/auth`)
   as authorized redirect URIs.
3. Set `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_REDIRECT_URI` in `.env`.

Sign-in uses the Authorization Code + PKCE flow directly against
Google's OAuth endpoints (`src/services/googleAuth.js`) — no extra SDK
required.

## Assets

Place referenced images/fonts under `public/assets/`:

- `public/assets/images/` — hero art, about/register photos, sponsor
  logos, demo video poster
- `public/assets/videos/` — demo video file
- `public/assets/fonts/` — self-hosted `AmstelvarAlpha` variable font
  (all other typefaces load from Google Fonts in `index.html`)

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint