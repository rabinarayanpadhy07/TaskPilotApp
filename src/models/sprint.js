import { todayISO } from "@/models/issue"

/**
 * Sprint model shared by the UI, the mock data source and the DRF services.
 *
 * @typedef {"planned"|"active"|"completed"} SprintStatus
 *
 * @typedef {object} SprintStats   computed by the API from the sprint's issues
 * @property {number} total        stories/tasks/bugs in the sprint
 * @property {number} done
 * @property {number} points       story points in the sprint
 * @property {number} donePoints
 * @property {Record<string, number>} byStatus
 *
 * @typedef {object} Sprint
 * @property {string} id
 * @property {string} projectId
 * @property {string} name
 * @property {string} goal
 * @property {string|null} startDate   "YYYY-MM-DD"
 * @property {string|null} endDate     "YYYY-MM-DD"
 * @property {SprintStatus} status
 * @property {string|null} completedAt
 * @property {SprintStats} stats
 */

export const SPRINT_STATUSES = [
  { value: "active", label: "Active", variant: "primary" },
  { value: "planned", label: "Planned", variant: "neutral" },
  { value: "completed", label: "Completed", variant: "success" },
]

export const sprintStatusConfig = Object.fromEntries(SPRINT_STATUSES.map((s) => [s.value, s]))

export const emptySprintStats = () => ({ total: 0, done: 0, points: 0, donePoints: 0, byStatus: {} })

// ---------- Business rules (mirror them in the DRF serializer/service) ----------

/** Do two inclusive "YYYY-MM-DD" ranges overlap? */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd
}

/**
 * Validates sprint dates against the project's other sprints.
 * Rules: end after start; planned/active sprints in a project may not overlap.
 * Returns field errors keyed by form field ("startDate" / "endDate").
 */
export function validateSprintDates({ startDate, endDate }, otherSprints = []) {
  const errors = {}
  if (!startDate || !endDate) return errors
  if (endDate <= startDate) {
    errors.endDate = "The end date must be after the start date."
    return errors
  }
  const clash = otherSprints.find(
    (s) => s.status !== "completed" && s.startDate && s.endDate && rangesOverlap(startDate, endDate, s.startDate, s.endDate)
  )
  if (clash) errors.startDate = `These dates overlap ${clash.name} (${clash.startDate} – ${clash.endDate}).`
  return errors
}

/** Whole days left in an active sprint (0 on the last day, negative when overdue). */
export function sprintDaysLeft(sprint, today = todayISO()) {
  if (!sprint.endDate) return null
  const [y1, m1, d1] = today.split("-").map(Number)
  const [y2, m2, d2] = sprint.endDate.split("-").map(Number)
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86_400_000)
}

export const sprintProgress = (sprint) =>
  sprint.stats.total > 0 ? Math.round((sprint.stats.done / sprint.stats.total) * 100) : null

// ---------- DRF mapping ----------

export function sprintFromApi(data) {
  const stats = data.stats ?? {}
  return {
    id: String(data.id),
    projectId: String(data.project),
    name: data.name,
    goal: data.goal ?? "",
    startDate: data.start_date ?? null,
    endDate: data.end_date ?? null,
    status: data.status,
    completedAt: data.completed_at ?? null,
    stats: {
      total: stats.total ?? 0,
      done: stats.done ?? 0,
      points: stats.points ?? 0,
      donePoints: stats.done_points ?? 0,
      byStatus: stats.by_status ?? {},
    },
  }
}

export function sprintToApi({ name, goal, startDate, endDate }) {
  return { name, goal, start_date: startDate || null, end_date: endDate || null }
}

export const sprintApiFieldMap = { name: "name", goal: "goal", start_date: "startDate", end_date: "endDate" }
