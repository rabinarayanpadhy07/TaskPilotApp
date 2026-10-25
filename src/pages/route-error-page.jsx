import { RotateCw, TriangleAlert } from "lucide-react"
import { isRouteErrorResponse, useRouteError } from "react-router"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

/** Rendered by the router when a route throws while loading or rendering. */
export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred."

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <EmptyState
        role="alert"
        icon={TriangleAlert}
        headingLevel="h1"
        title="Something went wrong"
        description={message}
        action={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            <RotateCw />
            Reload page
          </Button>
        }
      />
    </div>
  )
}
