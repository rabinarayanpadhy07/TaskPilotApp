/**
 * Runtime configuration, read from Vite env variables (see .env.example).
 */

/** Base URL of the Django REST API. In dev, `/api` is proxied to Django by Vite. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api"
