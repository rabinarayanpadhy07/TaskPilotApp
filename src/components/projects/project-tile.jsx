import { CheckCheck, CheckCircle2, ClipboardList, Code2, Lock, Palette } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PROJECT_PHASES, PROJECT_STATUSES } from "@/models/project"

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

export function ProjectStatusBadge({ status, className }) {
  const config = statusConfig[status] ?? statusConfig.planning
  return (
    <Badge variant={config.variant} dot className={className}>
      {config.label}
    </Badge>
  )
}

const phaseIcons = {
  planning: ClipboardList,
  design: Palette,
  development: Code2,
  testing: CheckCircle2,
  completed: CheckCheck,
}

const phaseVariants = {
  planning: "neutral",
  design: "outline",
  development: "primary",
  testing: "warning",
  completed: "success",
}

export function ProjectPhaseBadge({ phase, className, showIcon = true }) {
  const p = PROJECT_PHASES.find((item) => item.value === phase) ?? PROJECT_PHASES[0]
  const Icon = phaseIcons[p.value] ?? ClipboardList
  const variant = phaseVariants[p.value] ?? "neutral"

  return (
    <Badge variant={variant} className={cn("gap-1.5 font-normal", className)} title={`Phase: ${p.label} - ${p.description}`}>
      {showIcon && <Icon className="size-3" aria-hidden="true" />}
      <span>Phase: {p.label}</span>
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
