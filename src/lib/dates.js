import { todayISO } from "@/models/issue"

/** Parses "YYYY-MM-DD" as a local calendar date (not UTC midnight). */
export function parseDateOnly(value) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function addDaysISO(days, from = todayISO()) {
  const date = parseDateOnly(from)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** Whole days from today until `value` (negative = past). */
export function daysUntil(value) {
  return Math.round((parseDateOnly(value) - parseDateOnly(todayISO())) / 86_400_000)
}

/** "Today", "Tomorrow", "Yesterday", "Mon, Oct 14", or "Oct 14, 2027" outside this year. */
export function formatDueDate(value) {
  if (!value) return ""
  const days = daysUntil(value)
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days === -1) return "Yesterday"
  const date = parseDateOnly(value)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString("en", {
    weekday: sameYear && Math.abs(days) < 7 ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  })
}

/** "overdue" | "today" | "soon" (≤ 3 days) | "later" | null */
export function dueTone(value, done = false) {
  if (!value || done) return null
  const days = daysUntil(value)
  if (days < 0) return "overdue"
  if (days === 0) return "today"
  if (days <= 3) return "soon"
  return "later"
}

/** True when an ISO timestamp falls within the last `days` days. */
export function isWithinLastDays(value, days) {
  return Boolean(value) && Date.parse(value) >= Date.now() - days * 86_400_000
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
