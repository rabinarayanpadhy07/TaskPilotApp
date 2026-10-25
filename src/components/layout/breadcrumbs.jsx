import { Fragment } from "react"
import { ChevronRight } from "lucide-react"
import { Link, useMatches } from "react-router"

import { useActiveWorkspace } from "@/api/hooks"
import { cn } from "@/lib/utils"

/**
 * Builds the trail from route `handle.crumb` values (see app/router.jsx).
 * A crumb is a string, or a function `(match) => ReactNode` for dynamic labels
 * such as a project name. The active workspace is always the first crumb.
 * On small screens only the current page is shown.
 */
export function Breadcrumbs({ className }) {
  const matches = useMatches()
  const { workspace } = useActiveWorkspace()

  const crumbs = matches
    .filter((match) => match.handle?.crumb)
    .map((match) => ({
      id: match.id,
      to: match.pathname,
      label: typeof match.handle.crumb === "function" ? match.handle.crumb(match) : match.handle.crumb,
    }))

  if (workspace) crumbs.unshift({ id: "workspace", to: "/", label: workspace.name })

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={crumb.id}>
              <li className={cn("min-w-0", isLast ? "flex" : "hidden sm:flex")}>
                {isLast ? (
                  <span aria-current="page" className="truncate font-medium text-foreground">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="focus-ring truncate rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li role="presentation" aria-hidden="true" className="hidden shrink-0 sm:flex">
                  <ChevronRight className="size-3.5 text-muted-foreground/60" />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
