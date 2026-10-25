import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Placeholder for empty lists, first-run screens and "nothing found" results.
 *
 * @param {object} props
 * @param {React.ElementType} [props.icon] Lucide icon component
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.action] Usually one or two Buttons
 * @param {"default"|"bordered"} [props.variant] `bordered` adds a dashed frame for use inside pages
 * @param {"h1"|"h2"|"h3"} [props.headingLevel] use "h1" when the empty state is the whole page (404, errors)
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  headingLevel: Heading = "h3",
  className,
  ...props
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        variant === "bordered" && "rounded-lg border border-dashed border-input bg-surface",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-primary/10 bg-selected text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      )}
      <Heading className="text-sm font-semibold text-foreground">{title}</Heading>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
