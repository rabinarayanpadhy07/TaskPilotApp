/**
 * Session tokens.
 *
 * - The access token (JWT, ~10 min) lives only in memory: it's gone on reload
 *   and never readable from storage by injected scripts.
 * - The refresh token is an httpOnly cookie set by Django on /api/auth/. This
 *   module never sees it.
 * - A non-secret "has session" hint in storage tells the app whether trying a
 *   refresh on startup is worthwhile. localStorage when "Keep me signed in",
 *   otherwise sessionStorage, mirroring the cookie's lifetime.
 */

const SESSION_HINT_KEY = "taskpilot.session"

let accessToken = null

function safeStorage(kind) {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export const tokenStorage = {
  getAccessToken() {
    return accessToken
  },

  setAccessToken(token) {
    accessToken = token || null
  },

  hasSessionHint() {
    return safeStorage("local")?.getItem(SESSION_HINT_KEY) === "1" || safeStorage("session")?.getItem(SESSION_HINT_KEY) === "1"
  },

  startSession(access, { remember = true } = {}) {
    this.clear()
    accessToken = access
    safeStorage(remember ? "local" : "session")?.setItem(SESSION_HINT_KEY, "1")
  },

  clear() {
    accessToken = null
    safeStorage("local")?.removeItem(SESSION_HINT_KEY)
    safeStorage("session")?.removeItem(SESSION_HINT_KEY)
    // Refresh tokens from the previous storage-based scheme
    safeStorage("local")?.removeItem("taskpilot.refresh")
    safeStorage("session")?.removeItem("taskpilot.refresh")
  },
}
