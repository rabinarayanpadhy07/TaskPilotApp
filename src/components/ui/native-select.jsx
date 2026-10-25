import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/** Styled native <select>: fully accessible and mobile-friendly out of the box. */
function NativeSelect({ className, children, ...props }) {
  return (
    <div className="relative w-full">
      <select
        data-slot="native-select"
        className={cn(
          "h-9 w-full min-w-0 cursor-pointer appearance-none rounded-md border border-input bg-surface pr-9 pl-3 text-sm text-foreground shadow-xs transition-[color,border-color,box-shadow] outline-none",
          "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/20",
          "aria-invalid:border-danger aria-invalid:ring-danger/15 aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger/20",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { NativeSelect }
