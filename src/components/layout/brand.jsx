import { Send } from "lucide-react"

import { cn } from "@/lib/utils"

export function BrandMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className
      )}
    >
      <Send className="size-3.5 -translate-x-px translate-y-px" strokeWidth={2.25} />
    </span>
  )
}

export function Brand({ collapsed = false }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BrandMark />
      <span
        className={cn(
          "truncate text-[15px] font-semibold tracking-tight text-foreground",
          collapsed && "sr-only"
        )}
      >
        TaskPilot
      </span>
    </span>
  )
}
