/**
 * Single fetch instance shared by every API module.
 *
 * Responsibilities kept in one place so no caller has to repeat them:
 *  - resolves paths against VITE_API_URL
 *  - sends the auth cookie (`credentials: 'include'`) — the backend issues an
 *    httpOnly JWT cookie, so there is no token for JS to attach by hand
 *  - aborts requests that outlive the timeout
 *  - normalises every failure into an ApiError with a displayable message
 *  - broadcasts 401s so auth state can be cleared in one place
 */

const DEFAULT_TIMEOUT_MS = 15_000

const API_BASE_URL = String(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

/** Error shape thrown by every request in this layer. */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const unauthorizedListeners = new Set()

/**
 * Subscribe to 401 responses (expired or missing session). Returns an
 * unsubscribe function. Used by AuthContext to drop the signed-in user
 * without every page having to handle expiry itself.
 */
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

function notifyUnauthorized() {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // A misbehaving listener must not mask the original request failure.
    }
  })
}

/**
 * The API origin, with no trailing slash.
 *
 * An empty string means "same origin as the page", which is the deployed
 * arrangement where the SPA and the API sit behind one host and VITE_API_URL is
 * not set. Callers that need an absolute target (the Socket.IO connection) must
 * treat empty as "connect to the current origin" rather than passing it through.
 */
export function apiOrigin() {
  return API_BASE_URL
}

/**
 * Absolute URL on the API origin, or a root-relative path when no origin is
 * configured. Also used as the OAuth redirect target.
 */
export function apiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath
}

/**
 * Confirms the API is reachable before handing the browser to it.
 *
 * Sign-in is a top-level navigation to GET /auth/google, which means it leaves
 * the SPA entirely — so if the API is down the user gets the browser's own
 * ERR_CONNECTION_REFUSED page, on the API's domain, with nothing to explain it.
 * That is indistinguishable from "Google sign-in is broken", and it is the wrong
 * thing to go debugging.
 *
 * Throws an ApiError with a message the sign-in screen can render. Kept short:
 * this runs on a click, so it must not sit there spinning.
 */
export async function assertApiReachable() {
  try {
    await request('/health', { timeoutMs: 4000, notifyOnUnauthorized: false })
  } catch (error) {
    if (error.code === 'network' || error.code === 'timeout') {
      throw new ApiError(
        'Cannot reach the server, so sign-in cannot start. Make sure the API is running at ' +
          `${API_BASE_URL || 'this site’s own origin'} and try again.`,
        { code: error.code }
      )
    }
    throw error
  }
}

const FALLBACK_MESSAGES = {
  400: 'That request was rejected. Please check the details and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  409: 'That conflicts with something that already exists.',
  429: 'Too many requests. Please wait a moment and try again.'
}

function messageForStatus(status) {
  if (FALLBACK_MESSAGES[status]) return FALLBACK_MESSAGES[status]
  if (status >= 500) return 'The server ran into a problem. Please try again shortly.'
  return 'Something went wrong. Please try again.'
}

async function readPayload(response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '')
    return text ? { message: text } : null
  }

  return response.json().catch(() => null)
}

/**
 * Performs a request and returns the parsed JSON body.
 *
 * @param {string} path            API path, e.g. '/party/create'
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {unknown} [options.body]  serialised as JSON when present
 * @param {number} [options.timeoutMs]
 * @param {AbortSignal} [options.signal]  caller-owned cancellation
 * @param {boolean} [options.notifyOnUnauthorized]  set false for probes such
 *        as GET /auth/me, where a 401 simply means "not signed in"
 */
export async function request(
  path,
  {
    method = 'GET',
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    notifyOnUnauthorized = true
  } = {}
) {
  const url = apiUrl(path)
  const controller = new AbortController()
  let timedOut = false

  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const abortFromCaller = () => controller.abort()
  signal?.addEventListener('abort', abortFromCaller)

  let response
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    })
  } catch (error) {
    if (timedOut) {
      throw new ApiError('The server took too long to respond. Please try again.', {
        code: 'timeout'
      })
    }
    if (signal?.aborted) {
      throw new ApiError('Request cancelled.', { code: 'aborted' })
    }
    throw new ApiError(
      'Could not reach the server. Check your connection and that the API is running.',
      { code: 'network', details: error }
    )
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }

  const payload = await readPayload(response)

  if (!response.ok) {
    if (response.status === 401 && notifyOnUnauthorized) {
      notifyUnauthorized()
    }

    // Auth/admin controllers reply with `error`, party controllers with
    // `message` — accept either before falling back to a status message.
    const serverMessage = payload?.message ?? payload?.error
    throw new ApiError(serverMessage || messageForStatus(response.status), {
      status: response.status,
      code: response.status === 401 ? 'unauthorized' : 'http',
      details: payload
    })
  }

  return payload
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' })
}
