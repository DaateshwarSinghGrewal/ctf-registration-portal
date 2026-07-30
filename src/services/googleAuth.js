/**
 * Minimal Google OAuth 2.0 (Authorization Code + PKCE) client.
 *
 * No external SDK is required: this talks to Google's standard OAuth
 * endpoints directly via redirect, which matches the "Click here to sign in
 * with Google" flow identified on the Website's registration teaser and the
 * standalone Google Auth screen.
 *
 * Required environment variables (set in .env, see project root):
 *   VITE_GOOGLE_CLIENT_ID   - OAuth 2.0 Client ID from Google Cloud Console
 *   VITE_GOOGLE_REDIRECT_URI - Must match an authorized redirect URI,
 *                              e.g. http://localhost:5173/auth/callback
 */

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'

const PKCE_VERIFIER_KEY = 'somnium.auth.pkce_verifier'

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateRandomString(length) {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return base64UrlEncode(array.buffer)
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

/**
 * Builds the Google consent URL and redirects the browser to it.
 * Call this from the "sign in with Google" action on the Website teaser
 * or the standalone Google Auth screen.
 */
export async function startGoogleSignIn() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw new Error(
      'Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_REDIRECT_URI in .env'
    )
  }

  const codeVerifier = generateRandomString(64)
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  window.sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account'
  })

  window.location.assign(`${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`)
}

/**
 * Exchanges the authorization code (present in the callback URL's query
 * string) for tokens, then fetches the signed-in user's profile.
 * Returns a plain object: { id, name, email, avatarUrl }
 */
export async function completeGoogleSignIn(callbackUrl) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI
  const codeVerifier = window.sessionStorage.getItem(PKCE_VERIFIER_KEY)

  const url = new URL(callbackUrl)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    throw new Error(`Google sign-in was cancelled or denied: ${error}`)
  }

  if (!code || !codeVerifier) {
    throw new Error('Missing authorization code or PKCE verifier for Google sign-in.')
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier
    })
  })

  if (!tokenResponse.ok) {
    throw new Error('Google sign-in failed while exchanging the authorization code.')
  }

  const tokenData = await tokenResponse.json()

  const profileResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  })

  if (!profileResponse.ok) {
    throw new Error('Google sign-in failed while fetching the user profile.')
  }

  const profile = await profileResponse.json()

  window.sessionStorage.removeItem(PKCE_VERIFIER_KEY)

  return {
    id: profile.sub,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.picture
  }
}