import { parseDateOnly } from "@/lib/dates"

export const shortDate = (iso) => parseDateOnly(iso).toLocaleDateString("en", { month: "short", day: "numeric" })

export function bucketLabel(bucket, granularity) {
  if (granularity === "day" || bucket.start === bucket.end) return shortDate(bucket.start)
  return `${shortDate(bucket.start)} – ${shortDate(bucket.end)}`
}

/** Committed vs completed: the comparison series is grayed out, completed carries the hue. */
export const VELOCITY_SERIES = [
  { key: "committedPoints", label: "Committed", color: "var(--chart-muted)" },
  { key: "completedPoints", label: "Completed", color: "var(--chart-1)" },
]

/** Open work by stage, an ordered stack, so it uses the ordinal ramp (light → dark). */
export const WORKLOAD_SERIES = [
  { key: "notStarted", label: "Not started", statuses: ["backlog", "todo"], color: "var(--chart-ramp-1)" },
  { key: "inProgress", label: "In progress", statuses: ["in_progress"], color: "var(--chart-ramp-2)" },
  { key: "inReview", label: "In review", statuses: ["in_review"], color: "var(--chart-ramp-3)" },
]

export function workloadRows(workload) {
  return workload.map((row) => ({
    ...row,
    label: row.assignee?.name ?? "Unassigned",
    ...Object.fromEntries(WORKLOAD_SERIES.map((s) => [s.key, s.statuses.reduce((sum, st) => sum + (row.byStatus[st] ?? 0), 0)])),
  }))
}
