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

export function apiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (!API_BASE_URL) {
    // Fallback to same-origin relative path if no base URL is configured
    return cleanPath
  }
  return `${API_BASE_URL}${cleanPath}`
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
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' })
}
