/**
 * Authentication API (real network calls to Django REST Framework).
 * There is no mock fallback here: without a running backend these reject,
 * and the UI shows the error.
 */
import { endpoints } from "@/api/endpoints"
import { apiClient } from "@/lib/api-client"
import { tokenStorage } from "@/lib/token-storage"

/** Maps the DRF user payload to the shape the UI uses. */
export function toUser(data) {
  return {
    id: String(data.id),
    email: data.email,
    name: data.full_name || data.name || data.email,
    title: data.title ?? "",
  }
}

export const authService = {
  /** POST /auth/register/ → 201 user. Does not sign in by itself. */
  async register({ fullName, email, password }) {
    const { data } = await apiClient.post(
      endpoints.auth.register,
      { full_name: fullName, email, password },
      { skipAuth: true }
    )
    return toUser(data)
  },

  /**
   * POST /auth/login/ → { access, user }. The refresh token arrives as an
   * httpOnly cookie (persistent when `remember`, else for this browser session).
   */
  async login({ email, password, remember = true }) {
    const { data } = await apiClient.post(endpoints.auth.login, { email, password, remember }, { skipAuth: true })
    tokenStorage.startSession(data.access, { remember })
    return data.user ? toUser(data.user) : null
  },

  /**
   * POST /auth/logout/: the server blacklists the refresh cookie and clears it.
   * Local state is cleared even if the request fails (e.g. offline).
   */
  async logout() {
    try {
      await apiClient.post(endpoints.auth.logout, null, { skipAuthRefresh: true })
    } finally {
      tokenStorage.clear()
    }
  },

  /** GET /auth/me/ → the signed-in user. */
  async getCurrentUser() {
    const { data } = await apiClient.get(endpoints.auth.me)
    return toUser(data)
  },

  /**
   * POST /auth/password-reset/ → 200/204. The server should respond the same
   * whether or not the email exists, to avoid revealing accounts.
   */
  async requestPasswordReset({ email }) {
    await apiClient.post(endpoints.auth.passwordReset, { email }, { skipAuth: true })
  },

  /** PATCH /auth/me/ { full_name, title } */
  async updateProfile({ name, title }) {
    const { data } = await apiClient.patch(endpoints.auth.me, { full_name: name, title })
    return toUser(data)
  },

  /** Signs out every other session; this one continues with the returned access token. */
  async changePassword({ currentPassword, newPassword }) {
    const { data } = await apiClient.post(endpoints.auth.passwordChange, { current_password: currentPassword, new_password: newPassword })
    tokenStorage.setAccessToken(data.access)
  },

  /** POST /auth/password-reset/confirm/ with the uid/token from the emailed link. */
  async confirmPasswordReset({ uid, token, password }) {
    await apiClient.post(endpoints.auth.passwordResetConfirm, { uid, token, password }, { skipAuth: true })
  },

  hasStoredSession() {
    return tokenStorage.hasSessionHint()
  },
}
