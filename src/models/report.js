import { addDaysISO } from "@/lib/dates"
import { todayISO } from "@/models/issue"

/**
 * Workspace report, aggregated by the API from issues the caller can see.
 *
 * @typedef {object} Report
 * @property {{ from: string, to: string, granularity: "day"|"week" }} range
 * @property {string[]} projectIds          projects included (visible to the caller)
 * @property {{ issues: number, open: number, completedInRange: number, overdue: number }} totals
 * @property {{ status: string, count: number }[]} statusDistribution   current snapshot, epics excluded
 * @property {{ start: string, end: string, count: number, points: number }[]} completedOverTime
 * @property {object[]} sprintVelocity      completed sprints in range + active sprints
 * @property {object[]} workload            open issues per assignee (null = unassigned)
 * @property {object[]} overdue             up to 50, most overdue first
 * @property {object[]} epicProgress
 */

export const REPORT_RANGES = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "custom", label: "Custom range" },
]

export const MAX_REPORT_RANGE_DAYS = 366

/** Resolves a preset (or custom from/to) into concrete dates. */
export function resolveReportRange({ range = "30d", from, to }) {
  const preset = REPORT_RANGES.find((r) => r.value === range && r.days)
  if (preset) {
    const end = todayISO()
    return { from: addDaysISO(-(preset.days - 1), end), to: end }
  }
  return { from: from || addDaysISO(-29), to: to || todayISO() }
}

const idOrNull = (value) => (value == null ? null : String(typeof value === "object" ? value.id : value))

export function reportFromApi(data) {
  return {
    range: { from: data.range.from, to: data.range.to, granularity: data.range.granularity },
    projectIds: (data.projects ?? []).map(String),
    totals: {
      issues: data.totals?.issues ?? 0,
      open: data.totals?.open ?? 0,
      completedInRange: data.totals?.completed_in_range ?? 0,
      overdue: data.totals?.overdue ?? 0,
    },
    statusDistribution: data.status_distribution ?? [],
    completedOverTime: data.completed_over_time ?? [],
    sprintVelocity: (data.sprint_velocity ?? []).map((s) => ({
      id: String(s.id),
      name: s.name,
      projectId: String(s.project),
      projectKey: s.project_key,
      status: s.status,
      startDate: s.start_date,
      endDate: s.end_date,
      committedPoints: s.committed_points ?? 0,
      completedPoints: s.completed_points ?? 0,
      total: s.total ?? 0,
      done: s.done ?? 0,
    })),
    workload: (data.workload ?? []).map((row) => ({
      assigneeId: idOrNull(row.assignee),
      assignee: row.assignee ? { id: String(row.assignee.id), name: row.assignee.full_name || row.assignee.email } : null,
      byStatus: row.by_status ?? {},
      open: row.open ?? 0,
      points: row.points ?? 0,
      overdue: row.overdue ?? 0,
    })),
    overdue: (data.overdue ?? []).map((i) => ({
      key: i.key,
      title: i.title,
      projectId: String(i.project),
      type: i.issue_type,
      priority: i.priority,
      status: i.status,
      assigneeId: idOrNull(i.assignee),
      dueDate: i.due_date,
      daysOverdue: i.days_overdue,
    })),
    epicProgress: (data.epic_progress ?? []).map((e) => ({
      key: e.key,
      title: e.title,
      projectId: String(e.project),
      status: e.status,
      dueDate: e.due_date,
      total: e.total,
      done: e.done,
      points: e.points,
      donePoints: e.done_points,
    })),
  }
}
