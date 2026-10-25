import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-[color,border-color,box-shadow] outline-none placeholder:text-muted-foreground",
          "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/20",
          "aria-invalid:border-danger aria-invalid:ring-danger/15 aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger/20",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
