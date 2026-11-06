import { API_BASE_URL } from "@/config"

/**
 * Turns an Axios error from the DRF API into something the UI can show.
 *
 * DRF error shapes handled:
 *   { "detail": "..." }                         -> message
 *   { "non_field_errors": ["..."] }             -> message
 *   { "email": ["..."], "password": ["..."] }   -> fieldErrors
 *
 * @returns {{ message: string, fieldErrors: Record<string, string>, status?: number, isNetworkError: boolean }}
 */
export function parseApiError(error, fallback = "Something went wrong. Please try again.") {
  const response = error?.response

  if (!response) {
    const timedOut = error?.code === "ECONNABORTED"
    return {
      message: timedOut
        ? "The server took too long to respond. Please try again."
        : `Can't reach the TaskPilot API${import.meta.env.DEV ? ` at ${API_BASE_URL}` : ""}. Check your connection${import.meta.env.DEV ? " and that the Django server is running" : ""}.`,
      fieldErrors: {},
      isNetworkError: true,
    }
  }

  const { status, data } = response

  // Vite's dev proxy answers 5xx with a non-JSON body when Django isn't running
  if (status >= 500) {
    const detailMessage =
      data && typeof data === "object"
        ? data.detail || (Array.isArray(data.non_field_errors) ? data.non_field_errors.join(" ") : null)
        : null

    return {
      message:
        detailMessage ||
        (import.meta.env.DEV
          ? `The TaskPilot API isn't responding (HTTP ${status}). Make sure the Django server is running.`
          : "Something went wrong on our side. Please try again in a moment."),
      fieldErrors: {},
      status,
      isNetworkError: status === 502 || status === 503 || status === 504,
    }
  }

  const fieldErrors = {}
  let message = ""

  if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data)) {
      const text = Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : ""
      if (!text) continue
      if (key === "detail" || key === "non_field_errors") message = message || text
      else fieldErrors[key] = text
    }
  }

  if (!message && status === 429) message = "Too many attempts. Please wait a moment and try again."
  if (!message && Object.keys(fieldErrors).length === 0) message = fallback

  return { message, fieldErrors, status, isNetworkError: false }
}

/**
 * Shows server field errors inline on a React Hook Form form.
 * `fieldMap` maps API field names (snake_case) to form field names.
 * Returns messages for API fields that aren't on the form, so callers can show them.
 */
export function applyFieldErrors(setError, fieldErrors, fieldMap) {
  const unmatched = []
  for (const [apiField, message] of Object.entries(fieldErrors)) {
    const formField = fieldMap[apiField]
    if (formField) setError(formField, { type: "server", message }, { shouldFocus: true })
    else unmatched.push(message)
  }
  return unmatched
}
