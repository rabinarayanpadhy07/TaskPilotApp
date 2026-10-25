import { cn } from "@/lib/utils"

/**
 * Accessible progress bar. `value` is 0–100; `null` renders an empty track
 * with "No issues yet" semantics left to the caller's label.
 */
export function Progress({ value, label, tone = "primary", className }) {
  const tones = { primary: "bg-primary", success: "bg-success" }
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      aria-valuetext={value == null ? "No issues yet" : `${value}%`}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full transition-[width]", tones[tone])} style={{ width: `${value ?? 0}%` }} />
    </div>
  )
}
