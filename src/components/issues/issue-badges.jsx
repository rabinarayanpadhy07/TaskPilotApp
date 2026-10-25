import {
  Bookmark,
  Bug,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Equal,
  ListTree,
  SquareCheck,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { issuePriorityLabel, issueStatusLabel, issueTypeLabel } from "@/models/issue"
import { cn } from "@/lib/utils"

const typeConfig = {
  epic: { icon: Zap, className: "bg-primary/10 text-primary" },
  story: { icon: Bookmark, className: "bg-success/10 text-success-text" },
  task: { icon: SquareCheck, className: "bg-foreground/[0.06] text-foreground/70" },
  bug: { icon: Bug, className: "bg-danger/10 text-danger-text" },
  subtask: { icon: ListTree, className: "bg-foreground/[0.06] text-muted-foreground" },
}

const typeSizes = {
  sm: { box: "size-4 rounded-[4px]", icon: "size-2.5" },
  default: { box: "size-5 rounded-[5px]", icon: "size-3" },
  lg: { box: "size-7 rounded-md", icon: "size-4" },
}

/**
 * Small tinted tile identifying an issue type. Decorative by default; pass
 * `label` to expose the type name to assistive tech.
 */
export function IssueTypeIcon({ type, size = "default", label = false, className }) {
  const config = typeConfig[type] ?? typeConfig.task
  const Icon = config.icon
  const sizes = typeSizes[size]
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", sizes.box, config.className, className)}
      role={label ? "img" : undefined}
      aria-label={label ? issueTypeLabel[type] : undefined}
      aria-hidden={label ? undefined : "true"}
      title={issueTypeLabel[type]}
    >
      <Icon className={sizes.icon} strokeWidth={2.5} />
    </span>
  )
}

const priorityConfig = {
  highest: { icon: ChevronsUp, className: "text-danger" },
  high: { icon: ChevronUp, className: "text-warning" },
  medium: { icon: Equal, className: "text-muted-foreground" },
  low: { icon: ChevronDown, className: "text-muted-foreground" },
  lowest: { icon: ChevronsDown, className: "text-muted-foreground/70" },
}

export function PriorityIcon({ priority, className, label = false }) {
  const config = priorityConfig[priority] ?? priorityConfig.medium
  const Icon = config.icon
  return (
    <Icon
      className={cn("size-4 shrink-0", config.className, className)}
      strokeWidth={2.5}
      role={label ? "img" : undefined}
      aria-label={label ? `${issuePriorityLabel[priority]} priority` : undefined}
      aria-hidden={label ? undefined : "true"}
    />
  )
}

/** Priority icon + label. */
export function PriorityBadge({ priority, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-foreground", className)}>
      <PriorityIcon priority={priority} />
      {issuePriorityLabel[priority]}
    </span>
  )
}

const statusVariant = {
  backlog: "outline",
  todo: "neutral",
  in_progress: "primary",
  in_review: "warning",
  done: "success",
}

export function StatusBadge({ status, className }) {
  return (
    <Badge variant={statusVariant[status] ?? "neutral"} dot className={className}>
      {issueStatusLabel[status] ?? status}
    </Badge>
  )
}
