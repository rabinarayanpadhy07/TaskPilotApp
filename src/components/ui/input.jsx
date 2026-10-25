import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Text input. Pass `leadingIcon` (a Lucide component) to render an inset icon,
 * `addonStart` for fixed leading text (e.g. "https://"), and
 * `aria-invalid` to show the error state. All other props go to the <input>.
 */
function Input({ className, type = "text", leadingIcon: LeadingIcon, addonStart, ...props }) {
  if (addonStart) {
    return (
      <div
        data-slot="input-group"
        className={cn(
          "flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-surface shadow-xs transition-[border-color,box-shadow]",
          "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ring/20",
          "has-aria-invalid:border-danger has-aria-invalid:ring-danger/15 has-aria-invalid:focus-within:border-danger has-aria-invalid:focus-within:ring-danger/20",
          "has-disabled:cursor-not-allowed has-disabled:bg-muted has-disabled:opacity-60"
        )}
      >
        <span aria-hidden="true" className="pl-3 text-sm whitespace-nowrap text-muted-foreground select-none">
          {addonStart}
        </span>
        <input
          type={type}
          data-slot="input"
          className={cn(
            "h-full w-full min-w-0 bg-transparent pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
      </div>
    )
  }

  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-sm text-foreground shadow-xs transition-[color,border-color,box-shadow] outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/20",
        "aria-invalid:border-danger aria-invalid:ring-danger/15 aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger/20",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        LeadingIcon && "pl-9",
        className
      )}
      {...props}
    />
  )

  if (!LeadingIcon) return input

  return (
    <div className="relative w-full">
      <LeadingIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      {input}
    </div>
  )
}

export { Input }
