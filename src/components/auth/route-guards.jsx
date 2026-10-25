import { Navigate, Outlet, useLocation } from "react-router"

import { BrandMark } from "@/components/layout/brand"
import { getRedirectTarget } from "@/lib/redirect"
import { useAuthStore } from "@/stores/auth-store"

/** Full-screen placeholder while a stored session is verified. */
export function SessionScreen() {
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
      <BrandMark className="size-9 animate-pulse" />
      <p className="text-sm text-muted-foreground">Checking your session…</p>
    </div>
  )
}

/**
 * Guards app routes. Signed-in users pass through; everyone else goes to
 * /login and returns here afterwards. Guests opening `/` itself see
 * `guestHome` (the landing page) instead.
 */
export function ProtectedRoute({ guestHome = null }) {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === "loading") return <SessionScreen />
  if (status === "authenticated") return <Outlet />
  if (guestHome && location.pathname === "/") return guestHome

  return <Navigate to="/login" replace state={{ from: location }} />
}

/**
 * Wraps sign-in / registration pages. Once signed in, redirects to the page
 * chosen by the auth flow, the `?redirect=` target, or Overview.
 */
export function GuestRoute() {
  const status = useAuthStore((state) => state.status)
  const redirectAfterAuth = useAuthStore((state) => state.redirectAfterAuth)
  const location = useLocation()

  if (status === "loading") return <SessionScreen />
  if (status === "authenticated") {
    return <Navigate to={redirectAfterAuth ?? getRedirectTarget(location) ?? "/"} replace />
  }

  return <Outlet />
}
