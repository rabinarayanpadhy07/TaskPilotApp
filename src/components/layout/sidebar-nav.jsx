import { NavLink } from "react-router"

import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * A single sidebar link. Shows an icon (or custom `leading` element), a label and
 * an optional counter. In the collapsed rail only the icon remains, with the label
 * moved to a tooltip and the accessible name.
 */
export function SidebarLink({
  to,
  end,
  label,
  icon: Icon,
  leading,
  count = 0,
  countLabel,
  collapsed = false,
  onNavigate,
}) {
  const accessibleCount = count > 0 && countLabel ? `, ${count} ${countLabel}` : ""

  const link = (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      aria-label={collapsed ? `${label}${accessibleCount}` : undefined}
      className={({ isActive }) =>
        cn(
          "group/nav focus-ring relative flex h-8 items-center gap-2.5 rounded-md px-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-selected text-selected-foreground"
            : "text-muted-foreground hover:bg-hover hover:text-foreground",
          collapsed && "h-9 justify-center px-0"
        )
      }
    >
      {({ isActive }) => (
        <>
          {leading ?? (
            <Icon
              aria-hidden="true"
              className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover/nav:text-foreground")}
            />
          )}
          {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
          {!collapsed && count > 0 && (
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {count}
              {countLabel && <span className="sr-only"> {countLabel}</span>}
            </span>
          )}
          {collapsed && count > 0 && (
            <span aria-hidden="true" className="absolute top-1.5 right-2 size-1.5 rounded-full bg-primary" />
          )}
        </>
      )}
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

/** Titled group of sidebar links with an optional header action (e.g. "+"). */
export function SidebarSection({ title, action, collapsed = false, children }) {
  const headingId = `sidebar-section-${title.toLowerCase().replace(/\s+/g, "-")}`

  return (
    <section aria-labelledby={headingId}>
      <div className={cn("mb-1 flex h-7 items-center justify-between pr-1 pl-2", collapsed && "sr-only")}>
        <h2 id={headingId} className="text-xs font-medium tracking-normal text-muted-foreground">
          {title}
        </h2>
        {!collapsed && action}
      </div>
      {collapsed && <div aria-hidden="true" className="mx-2 mb-2 border-t" />}
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  )
}

export function SidebarSkeletonRows({ rows = 3, collapsed = false }) {
  return Array.from({ length: rows }, (_, index) => (
    <li key={index} className={cn("flex h-8 items-center gap-2.5 px-2", collapsed && "justify-center px-0")}>
      <Skeleton className="size-5 rounded-[5px]" />
      {!collapsed && <Skeleton className="h-3 flex-1" style={{ maxWidth: `${70 - index * 12}%` }} />}
    </li>
  ))
}
