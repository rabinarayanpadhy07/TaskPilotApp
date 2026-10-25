/** Only same-app paths are allowed, so `?redirect=` can't send users to another site. */
export function isSafeRedirect(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")
}

/**
 * Where to go after signing in: `?redirect=` (e.g. from an invitation link)
 * or the protected page the user was bounced from.
 */
export function getRedirectTarget(location) {
  const fromQuery = new URLSearchParams(location.search).get("redirect")
  if (isSafeRedirect(fromQuery)) return fromQuery

  const from = location.state?.from
  if (from && isSafeRedirect(from.pathname)) return `${from.pathname}${from.search ?? ""}`

  return null
}

/** Appends `?redirect=` to an auth page link while preserving the target. */
export function withRedirect(path, redirect) {
  return redirect ? `${path}?redirect=${encodeURIComponent(redirect)}` : path
}
