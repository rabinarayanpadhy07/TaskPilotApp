import { create } from "zustand"

import { refreshAccessToken, setUnauthorizedHandler } from "@/lib/api-client"
import { parseApiError } from "@/lib/api-errors"
import { queryClient } from "@/lib/query-client"
import { tokenStorage } from "@/lib/token-storage"
import { authService } from "@/services/auth-service"

let initializePromise = null

/**
 * Session state.
 *
 * status:
 *   "loading"         a previous session is being restored (refresh cookie → GET /auth/me/)
 *   "authenticated"   signed in; `user` is the real user
 *   "unauthenticated" signed out
 *
 * `notice` is a one-off message for the sign-in page (session expired, ...).
 * `redirectAfterAuth` lets a page choose where to land after signing in
 * (GuestRoute performs the redirect).
 */
export const useAuthStore = create((set, get) => ({
  status: authService.hasStoredSession() ? "loading" : "unauthenticated",
  user: null,
  notice: null,
  redirectAfterAuth: null,

  /** Restores a previous session on app start. Safe to call more than once. */
  initialize() {
    if (get().status !== "loading") return Promise.resolve()

    // Exchange the refresh cookie for an access token first, so the first API
    // call is authenticated instead of failing with a 401 and retrying.
    initializePromise ??= refreshAccessToken()
      .catch((error) => {
        if (error?.response?.status === 401) tokenStorage.clear()
        throw error
      })
      .then(() => authService.getCurrentUser())
      .then((user) => set({ status: "authenticated", user }))
      .catch((error) => {
        const { isNetworkError, status, message } = parseApiError(error)
        // A 401 already cleared the session in the API client. For outages the
        // cookie is kept, so a later reload can still restore the session.
        set({
          status: "unauthenticated",
          user: null,
          notice:
            isNetworkError || (status ?? 500) >= 500
              ? `We couldn't verify your session. ${message}`
              : "Your session has ended. Please sign in again.",
        })
      })
      .finally(() => {
        initializePromise = null
      })

    return initializePromise
  },

  async login({ email, password, remember }, { redirectTo = null } = {}) {
    const user = (await authService.login({ email, password, remember })) ?? (await authService.getCurrentUser())
    queryClient.clear()
    set({ status: "authenticated", user, notice: null, redirectAfterAuth: redirectTo })
  },

  /** Creates the account, then signs in with the same credentials. */
  async register({ fullName, email, password }, { redirectTo = null } = {}) {
    await authService.register({ fullName, email, password })
    await get().login({ email, password, remember: true }, { redirectTo })
  },

  async logout() {
    try {
      await authService.logout()
    } catch {
      // Local state is cleared regardless; the server-side revocation is best effort
    }
    queryClient.clear()
    set({ status: "unauthenticated", user: null, notice: null, redirectAfterAuth: null })
  },

  /** Keeps the signed-in user in sync after a profile edit. */
  setUser(user) {
    set({ user })
  },

  /** Called by the API client when the session can no longer be refreshed. */
  handleUnauthorized() {
    if (get().status !== "authenticated" && get().status !== "loading") return
    queryClient.clear()
    set({ status: "unauthenticated", user: null, notice: "Your session has expired. Please sign in again." })
  },

  clearNotice() {
    set({ notice: null })
  },
}))

setUnauthorizedHandler(() => useAuthStore.getState().handleUnauthorized())
