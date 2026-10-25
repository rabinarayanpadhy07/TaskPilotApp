import { byRank } from "@/models/rank"
import { priorityRank, statusRank } from "@/models/issue"

/** Special filter values for "no assignee", "not in a sprint" and "no epic". */
export const NONE = "none"

/** URL-backed issue filter state (see useUrlFilters). Multi-value filters are arrays. */
export const ISSUE_FILTER_DEFAULTS = {
  q: "",
  status: [],
  assignee: [],
  priority: [],
  type: [],
  label: [],
  sprint: [],
  epic: [],
  sort: "",
}

export const FILTER_KEYS = ["q", "status", "assignee", "priority", "type", "label", "sprint", "epic"]

export const ISSUE_SORTS = [
  { value: "rank", label: "Manual order" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "due", label: "Due date" },
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest first" },
  { value: "key", label: "Key" },
]

const sorters = {
  rank: byRank,
  priority: (a, b) => priorityRank[a.priority] - priorityRank[b.priority] || byRank(a, b),
  status: (a, b) => statusRank[a.status] - statusRank[b.status] || priorityRank[a.priority] - priorityRank[b.priority],
  due: (a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || byRank(a, b),
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  key: (a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }),
}

export function sortIssues(issues, sort) {
  return [...issues].sort(sorters[sort] ?? sorters.rank)
}

const matchesAny = (selected, value) => selected.length === 0 || selected.includes(value ?? NONE)

/**
 * Applies filter values to issues (client-side for the prototype; the same
 * parameters map 1:1 to query params for the DRF list endpoint).
 * `epicOf(issue)` returns the epic id for an issue (its parent epic, or for a
 * subtask its parent's epic).
 */
export function applyIssueFilters(issues, filters, { epicOf = (issue) => issue.parentId } = {}) {
  const q = (filters.q ?? "").trim().toLowerCase()
  return issues.filter(
    (issue) =>
      (!q ||
        issue.title.toLowerCase().includes(q) ||
        issue.key.toLowerCase().includes(q) ||
        issue.labels.some((label) => label.includes(q))) &&
      matchesAny(filters.status ?? [], issue.status) &&
      matchesAny(filters.assignee ?? [], issue.assigneeId) &&
      matchesAny(filters.priority ?? [], issue.priority) &&
      matchesAny(filters.type ?? [], issue.type) &&
      matchesAny(filters.sprint ?? [], issue.sprintId) &&
      matchesAny(filters.epic ?? [], epicOf(issue)) &&
      ((filters.label ?? []).length === 0 || filters.label.some((label) => issue.labels.includes(label)))
  )
}

/** Resolves the epic an issue belongs to, walking up from subtasks. */
export function makeEpicResolver(issuesById) {
  return (issue) => {
    const parent = issuesById[issue.parentId]
    if (!parent) return null
    if (parent.type === "epic") return parent.id
    return issuesById[parent.parentId]?.type === "epic" ? parent.parentId : null
  }
}
