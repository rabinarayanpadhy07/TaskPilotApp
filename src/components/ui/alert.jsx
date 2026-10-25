import * as React from "react"
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

const variants = {
  danger: { icon: CircleAlert, className: "border-danger/20 bg-danger/5 text-danger-text", role: "alert" },
  warning: { icon: TriangleAlert, className: "border-warning/25 bg-warning/5 text-warning-text", role: "status" },
  success: { icon: CircleCheck, className: "border-success/20 bg-success/5 text-success-text", role: "status" },
  info: { icon: Info, className: "border-primary/15 bg-selected text-foreground [&>svg]:text-primary", role: "status" },
}

/**
 * Inline message box. `danger` alerts are announced immediately by screen readers.
 * @param {"danger"|"warning"|"success"|"info"} [props.variant]
 */
function Alert({ variant = "info", title, children, action, className, ...props }) {
  const config = variants[variant]
  const Icon = config.icon

  return (
    <div
      data-slot="alert"
      role={config.role}
      className={cn("flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm", config.className, className)}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-[13px] leading-5 opacity-90")}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

export { Alert }
