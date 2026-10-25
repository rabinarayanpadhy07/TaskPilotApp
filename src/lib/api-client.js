import axios from "axios"

import { endpoints } from "@/api/endpoints"
import { API_BASE_URL } from "@/config"
import { tokenStorage } from "@/lib/token-storage"

const baseConfig = {
  baseURL: API_BASE_URL,
  timeout: 15000,
  // Sends/receives the httpOnly refresh cookie (path /api/auth/) on cross-origin deployments too
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
}

/**
 * Shared Axios instance for the Django REST Framework API.
 *
 * - Adds `Authorization: Bearer <access>` when an access token is in memory.
 * - On a 401, refreshes the access token once (concurrent requests share the
 *   same refresh; the refresh token travels in its httpOnly cookie) and
 *   retries. If refreshing fails, the session is cleared and the registered
 *   unauthorized handler runs (the auth store signs out).
 *
 * Per-request options:
 *   `skipAuth: true`        don't attach the access token (login, register, ...)
 *   `skipAuthRefresh: true` don't try to refresh on 401
 */
export const apiClient = axios.create(baseConfig)

// Bare instance for the refresh call so it never goes through the interceptors
const refreshClient = axios.create(baseConfig)

let unauthorizedHandler = null
let refreshPromise = null

/** Registers what happens when the session can't be refreshed (set by the auth store). */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

/**
 * Exchanges the refresh cookie for a new access token. The server rotates the
 * cookie on every call and blacklists the previous one.
 */
export function refreshAccessToken() {
  refreshPromise ??= refreshClient
    .post(endpoints.auth.refresh)
    .then(({ data }) => {
      tokenStorage.setAccessToken(data.access)
      return data.access
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token && !config.skipAuth) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const canRefresh =
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.skipAuth &&
      !original.skipAuthRefresh &&
      tokenStorage.hasSessionHint()

    if (!canRefresh) return Promise.reject(error)

    original._retried = true
    try {
      await refreshAccessToken()
      return apiClient(original)
    } catch (refreshError) {
      // Only a rejected refresh ends the session. Throttling (429), outages and
      // network errors keep it, so the next request can try again.
      if (refreshError?.response?.status === 401) {
        tokenStorage.clear()
        unauthorizedHandler?.()
      }
      return Promise.reject(error)
    }
  }
)
