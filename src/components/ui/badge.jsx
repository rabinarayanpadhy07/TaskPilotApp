import * as React from "react"
import { cva } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-muted-foreground",
        primary: "border-primary/15 bg-selected text-selected-foreground",
        success: "border-success/20 bg-success/8 text-success-text",
        warning: "border-warning/20 bg-warning/8 text-warning-text",
        danger: "border-danger/20 bg-danger/8 text-danger-text",
        outline: "border-border bg-surface text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

const dotColors = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  outline: "bg-muted-foreground",
}

/**
 * Small status label.
 * @param {"neutral"|"primary"|"success"|"warning"|"danger"|"outline"} [props.variant]
 * @param {boolean} [props.dot] Prefix a small colored dot (useful for statuses).
 */
function Badge({ className, variant = "neutral", dot = false, asChild = false, children, ...props }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dot && !asChild && (
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", dotColors[variant])} />
      )}
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
