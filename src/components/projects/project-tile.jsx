import { Lock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PROJECT_STATUSES } from "@/models/project"

const tileSizes = {
  sm: "size-5 rounded-[5px] text-[10px]",
  default: "size-7 rounded-md text-xs",
  lg: "size-10 rounded-lg text-sm",
}

/**
 * Letter tile identifying a project (or team) by its key. Turns violet when an
 * ancestor link with `group/nav` is the current page.
 */
export function ProjectTile({ label, size = "default", className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center border border-border bg-surface font-semibold text-muted-foreground uppercase",
        "group-aria-[current=page]/nav:border-primary/25 group-aria-[current=page]/nav:text-primary",
        tileSizes[size],
        className
      )}
    >
      {label.slice(0, 1)}
    </span>
  )
}

const statusConfig = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.value, s]))

export function ProjectStatusBadge({ status }) {
  const config = statusConfig[status] ?? statusConfig.planning
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}

export function PrivateBadge() {
  return (
    <Badge variant="outline" title="Only project members can see this project">
      <Lock aria-hidden="true" />
      Private
    </Badge>
  )
}
