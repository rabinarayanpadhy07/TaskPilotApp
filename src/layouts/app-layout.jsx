import { Navigate, Outlet } from "react-router"

import { useWorkspaces } from "@/api/hooks"
import { SessionScreen } from "@/components/auth/route-guards"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { parseApiError } from "@/lib/api-errors"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"

/** Application shell: sidebar + top bar + routed page content. */
export function AppLayout() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const workspaces = useWorkspaces()

  if (workspaces.isPending) return <SessionScreen />
  if (workspaces.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <Alert
          variant="danger"
          title="We couldn't load your workspaces"
          className="max-w-md"
          action={
            <Button variant="secondary" size="sm" loading={workspaces.isFetching} onClick={() => workspaces.refetch()}>
              Try again
            </Button>
          }
        >
          {parseApiError(workspaces.error).message}
        </Alert>
      </div>
    )
  }
  // Everything in the app lives in a workspace: new accounts create or join one first
  if (workspaces.data.length === 0) return <Navigate to="/onboarding/workspace" replace />

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="focus-ring sr-only rounded-md bg-surface px-3 py-2 text-sm font-medium shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to main content
      </a>

      <Sidebar />
      <MobileNav />

      <div
        className={cn(
          "flex min-h-dvh flex-col",
          collapsed ? "lg:pl-(--sidebar-width-collapsed)" : "lg:pl-(--sidebar-width)"
        )}
      >
        <Topbar />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
