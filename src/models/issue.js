/**
 * Issue model shared by the UI, the mock data source and the DRF services.
 *
 * @typedef {"epic"|"story"|"task"|"bug"|"subtask"} IssueType
 * @typedef {"backlog"|"todo"|"in_progress"|"in_review"|"done"} IssueStatus
 * @typedef {"highest"|"high"|"medium"|"low"|"lowest"} IssuePriority
 *
 * @typedef {object} Issue
 * @property {string} id
 * @property {string} key              e.g. "WEB-12", unique per workspace
 * @property {string} projectId
 * @property {IssueType} type
 * @property {string} title
 * @property {string} description      plain text with line breaks
 * @property {IssueStatus} status
 * @property {IssuePriority} priority
 * @property {string|null} assigneeId
 * @property {string|null} reporterId
 * @property {string[]} labels
 * @property {string|null} dueDate     "YYYY-MM-DD"
 * @property {number|null} storyPoints
 * @property {string|null} parentId    epic for stories/tasks/bugs, issue for subtasks
 * @property {string|null} sprintId    sprint the issue is planned in (stories/tasks/bugs)
 * @property {number} rank             ordering on the board/backlog; assigned by the server
 * @property {string} createdAt        ISO timestamp
 * @property {string} updatedAt
 * @property {string|null} completedAt
 * @property {number} commentCount
 * @property {number} attachmentCount
 * @property {{ canEdit: boolean, canComment: boolean }} permissions
 *   UI hints from the API. The backend must still enforce permissions on every request.
 */

export const ISSUE_TYPES = [
  { value: "epic", label: "Epic", plural: "Epics" },
  { value: "story", label: "Story", plural: "Stories" },
  { value: "task", label: "Task", plural: "Tasks" },
  { value: "bug", label: "Bug", plural: "Bugs" },
  { value: "subtask", label: "Subtask", plural: "Subtasks" },
]

export const ISSUE_STATUSES = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "done", label: "Done" },
]

export const ISSUE_PRIORITIES = [
  { value: "highest", label: "Highest" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "lowest", label: "Lowest" },
]

export const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13, 21]

const labelOf = (list) => Object.fromEntries(list.map((item) => [item.value, item.label]))
export const issueTypeLabel = labelOf(ISSUE_TYPES)
export const issueStatusLabel = labelOf(ISSUE_STATUSES)
export const issuePriorityLabel = labelOf(ISSUE_PRIORITIES)

export const priorityRank = { highest: 0, high: 1, medium: 2, low: 3, lowest: 4 }
export const statusRank = { in_progress: 0, in_review: 1, todo: 2, backlog: 3, done: 4 }

// ---------- Hierarchy rules (mirror them in the DRF serializer) ----------

/** Which issue types may be the parent of `type`. Empty = no parent allowed. */
export function allowedParentTypes(type) {
  if (type === "epic") return []
  if (type === "subtask") return ["story", "task", "bug"]
  return ["epic"]
}

export const parentRequired = (type) => type === "subtask"

/** Which child types an issue of `type` can contain. */
export function allowedChildTypes(type) {
  if (type === "epic") return ["story", "task", "bug"]
  if (type === "subtask") return []
  return ["subtask"]
}

/** Issue types that live on the board and backlog (epics and subtasks don't). */
export const PLANNABLE_TYPES = ["story", "task", "bug"]
export const isPlannable = (issue) => PLANNABLE_TYPES.includes(issue.type)

// ---------- Derived state ----------

export const isDone = (issue) => issue.status === "done"

/** Local calendar date as "YYYY-MM-DD". */
export function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function isOverdue(issue, today = todayISO()) {
  return Boolean(issue.dueDate) && !isDone(issue) && issue.dueDate < today
}

/** Sort: soonest/overdue due date first (no date last), then higher priority. */
export function compareIssuesByUrgency(a, b) {
  const dueA = a.dueDate ?? "9999-12-31"
  const dueB = b.dueDate ?? "9999-12-31"
  if (dueA !== dueB) return dueA.localeCompare(dueB)
  return priorityRank[a.priority] - priorityRank[b.priority]
}

// ---------- DRF mapping ----------

const idOrNull = (value) => (value == null ? null : String(typeof value === "object" ? value.id : value))

/** DRF JSON (snake_case) → Issue */
export function issueFromApi(data) {
  return {
    id: String(data.id),
    key: data.key,
    projectId: idOrNull(data.project),
    type: data.issue_type,
    title: data.title,
    description: data.description ?? "",
    status: data.status,
    priority: data.priority,
    assigneeId: idOrNull(data.assignee),
    reporterId: idOrNull(data.reporter),
    labels: data.labels ?? [],
    dueDate: data.due_date ?? null,
    storyPoints: data.story_points ?? null,
    parentId: idOrNull(data.parent),
    sprintId: idOrNull(data.sprint),
    rank: Number(data.rank ?? 0),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    completedAt: data.completed_at ?? null,
    commentCount: data.comment_count ?? 0,
    attachmentCount: data.attachment_count ?? 0,
    // Default to read-only if the API ever omits them; it enforces them regardless
    permissions: {
      canEdit: Boolean(data.permissions?.can_edit),
      canComment: Boolean(data.permissions?.can_comment),
      canDelete: Boolean(data.permissions?.can_delete),
    },
  }
}

const apiFieldNames = {
  projectId: "project",
  type: "issue_type",
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  assigneeId: "assignee",
  reporterId: "reporter",
  labels: "labels",
  dueDate: "due_date",
  storyPoints: "story_points",
  parentId: "parent",
  sprintId: "sprint",
}

/** Partial Issue → DRF payload. Unknown/read-only fields are dropped. */
export function issueToApi(values) {
  const payload = {}
  for (const [field, apiField] of Object.entries(apiFieldNames)) {
    if (field in values) payload[apiField] = values[field]
  }
  return payload
}

/** DRF field name → form field name, for showing server validation errors inline. */
export const issueApiFieldMap = Object.fromEntries(Object.entries(apiFieldNames).map(([field, api]) => [api, field]))

/**
 * @typedef {object} IssueComment
 * @property {string} id
 * @property {string} issueId
 * @property {string} authorId
 * @property {string} body
 * @property {string} createdAt
 * @property {string|null} editedAt
 * @property {{ canEdit: boolean, canDelete: boolean }} permissions  from the API; enforced server-side
 *
 * @typedef {object} IssueActivity
 * @property {string} id
 * @property {string} issueId
 * @property {string} issueKey
 * @property {string} actorId
 * @property {"created"|"updated"|"commented"|"attachment_added"} kind
 * @property {string} [field]   for "updated": which field changed
 * @property {*} [from]
 * @property {*} [to]
 * @property {string} createdAt
 *
 * @typedef {object} IssueAttachment
 * @property {string} id
 * @property {string} fileName
 * @property {number} size          bytes
 * @property {string} contentType
 * @property {string|null} url      signed, short-lived download link from the API
 * @property {string} uploadedById
 * @property {string} createdAt
 */

export function commentFromApi(data) {
  return {
    id: String(data.id),
    issueId: String(data.issue),
    authorId: idOrNull(data.author),
    body: data.body,
    createdAt: data.created_at,
    editedAt: data.edited_at ?? null,
    permissions: { canEdit: Boolean(data.permissions?.can_edit), canDelete: Boolean(data.permissions?.can_delete) },
  }
}

export function activityFromApi(data) {
  return {
    id: String(data.id),
    issueId: idOrNull(data.issue),
    issueKey: data.issue_key ?? data.issue?.key ?? null,
    issueTitle: data.issue_title ?? data.issue?.title ?? null,
    projectId: idOrNull(data.project),
    actorId: idOrNull(data.actor),
    kind: data.kind,
    // API field names (due_date, assignee, ...) → model names used by the UI
    field: data.field == null ? null : (issueApiFieldMap[data.field] ?? data.field),
    from: data.from_value ?? null,
    to: data.to_value ?? null,
    createdAt: data.created_at,
  }
}

export function attachmentFromApi(data) {
  return {
    id: String(data.id),
    fileName: data.file_name,
    size: data.size,
    contentType: data.content_type,
    url: data.url ?? null,
    uploadedById: idOrNull(data.uploaded_by),
    createdAt: data.created_at,
  }
}

/** Limits enforced client-side for a fast response; the API must enforce them too. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_ACCEPT = "image/*,application/pdf,text/plain,text/csv,.doc,.docx,.xls,.xlsx,.zip"
