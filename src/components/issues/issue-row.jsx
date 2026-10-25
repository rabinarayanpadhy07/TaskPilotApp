import { CalendarClock } from "lucide-react"
import { Link } from "react-router"

import { IssueTypeIcon, PriorityIcon, StatusBadge } from "@/components/issues/issue-badges"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UserAvatar } from "@/components/user-avatar"
import { dueTone, formatDueDate } from "@/lib/dates"
import { paths } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { isDone } from "@/models/issue"

const toneClass = {
  overdue: "text-danger-text",
  today: "text-warning-text",
  soon: "text-foreground",
  later: "text-muted-foreground",
}

/** Due date with overdue/soon emphasis. Screen readers hear "Overdue" explicitly. */
export function DueDate({ value, done = false, showIcon = true, className }) {
  if (!value) return null
  const tone = dueTone(value, done)
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs whitespace-nowrap", done ? "text-muted-foreground" : toneClass[tone], className)}>
      {showIcon && <CalendarClock aria-hidden="true" className="size-3.5" />}
      {tone === "overdue" && <span className="sr-only">Overdue, due </span>}
      {formatDueDate(value)}
    </span>
  )
}

/**
 * One issue in a list: type, key, title, labels, status, priority, due date and
 * assignee. The whole row is a link to the issue.
 *
 * @param {object} props
 * @param {import("@/models/issue").Issue} props.issue
 * @param {object} [props.assignee] member object
 * @param {string} [props.projectName] shown as context when listing across projects
 * @param {string} [props.context]     other short context, e.g. the sprint name (overrides projectName)
 * @param {"default"|"compact"} [props.density]
 */
export function IssueRow({ issue, assignee, projectName, context, density = "default", className }) {
  const done = isDone(issue)
  const contextLabel = context ?? projectName

  return (
    <Link
      to={paths.issue(issue)}
      className={cn(
        "focus-ring group flex items-center gap-3 px-4 transition-colors hover:bg-hover sm:px-5",
        density === "compact" ? "py-2.5" : "py-3",
        className
      )}
    >
      <IssueTypeIcon type={issue.type} label />
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{issue.key}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
        <span className={cn("truncate text-sm font-medium", done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground group-hover:text-primary")}>
          {issue.title}
        </span>
        {contextLabel && <span className="truncate text-xs text-muted-foreground sm:hidden">{contextLabel}</span>}
        {issue.labels.length > 0 && density !== "compact" && (
          <span className="hidden shrink-0 gap-1 lg:flex">
            {issue.labels.slice(0, 2).map((label) => (
              <span key={label} className="rounded-sm border bg-surface px-1.5 py-px text-[11px] text-muted-foreground">
                {label}
              </span>
            ))}
          </span>
        )}
      </span>
      {contextLabel && <span className="hidden max-w-36 shrink-0 truncate text-xs text-muted-foreground md:block">{contextLabel}</span>}
      <DueDate value={issue.dueDate} done={done} className="hidden w-24 justify-end sm:inline-flex" />
      <StatusBadge status={issue.status} className="hidden sm:inline-flex" />
      <PriorityIcon priority={issue.priority} label />
      {assignee ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <UserAvatar name={assignee.name} size="sm" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Assignee: {assignee.name}</TooltipContent>
        </Tooltip>
      ) : (
        <span
          role="img"
          aria-label="Unassigned"
          title="Unassigned"
          className="size-6 shrink-0 rounded-full border border-dashed border-input"
        />
      )}
    </Link>
  )
}

/** Bordered list wrapper used by issue lists. */
export function IssueList({ children, className, label }) {
  return (
    <ul aria-label={label} className={cn("divide-y overflow-hidden rounded-lg border bg-card shadow-xs", className)}>
      {children}
    </ul>
  )
}

export function IssueListSkeleton({ rows = 4 }) {
  return (
    <div aria-busy="true" aria-label="Loading issues" className="divide-y overflow-hidden rounded-lg border bg-card">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-5 py-3.5">
          <Skeleton className="size-5" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 flex-1" style={{ maxWidth: `${60 - index * 8}%` }} />
          <Skeleton className="ml-auto h-5 w-20 rounded-full" />
          <Skeleton className="size-6 rounded-full" />
        </div>
      ))}
    </div>
  )
}
