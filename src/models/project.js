/**
 * Project model shared by the UI, the mock data source and the DRF services.
 *
 * @typedef {"on_track"|"at_risk"|"off_track"|"planning"|"completed"} ProjectStatus
 * @typedef {"planning"|"design"|"development"|"testing"|"completed"} ProjectPhase
 * @typedef {"workspace"|"private"} ProjectVisibility
 *
 * @typedef {object} IssueCounts  computed by the API from real issues
 * @property {number} total
 * @property {number} done
 * @property {number} open
 * @property {number} overdue
 * @property {Record<string, number>} byStatus
 * @property {Record<string, number>} byType
 *
 * @typedef {object} Project
 * @property {string} id
 * @property {string} workspaceId
 * @property {string} key
 * @property {string} name
 * @property {string} description
 * @property {ProjectStatus} status
 * @property {ProjectPhase} phase
 * @property {string|null} targetDate
 * @property {ProjectVisibility} visibility
 * @property {string|null} leadId
 * @property {string[]} memberIds
 * @property {IssueCounts} issueCounts
 * @property {"manager"|"contributor"|"viewer"|null} myRole  the caller's effective role (from the API)
 * @property {string[]} permissions  the caller's project permissions: UI hints, enforced server-side
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export const PROJECT_STATUSES = [
  { value: "on_track", label: "On track", variant: "success", description: "Progressing as scheduled" },
  { value: "at_risk", label: "At risk", variant: "warning", description: "Behind schedule or needs attention" },
  { value: "off_track", label: "Off track", variant: "danger", description: "Significantly delayed or blocked" },
  { value: "planning", label: "Planning", variant: "neutral", description: "Initial scoping and alignment" },
  { value: "completed", label: "Completed", variant: "primary", description: "Work is finished and delivered" },
]

export const PROJECT_PHASES = [
  { value: "planning", label: "Planning", step: 1, description: "Defining scope, requirements and goals" },
  { value: "design", label: "Design", step: 2, description: "UI/UX, system architecture and specs" },
  { value: "development", label: "Development", step: 3, description: "Active coding and sprint execution" },
  { value: "testing", label: "Testing", step: 4, description: "Quality assurance, review and bug fixes" },
  { value: "completed", label: "Completed", step: 5, description: "Launched and signed off" },
]

export const PROJECT_VISIBILITY = [
  { value: "workspace", label: "Workspace", description: "Everyone in the workspace can view and contribute." },
  { value: "private", label: "Private", description: "Only project members can see this project." },
]

export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/

export const emptyIssueCounts = () => ({ total: 0, done: 0, open: 0, overdue: 0, byStatus: {}, byType: {} })

/** Share of non-epic issues that are done, 0–100. `null` when there's nothing to measure. */
export function projectProgress(project) {
  const { total, done } = project.issueCounts ?? emptyIssueCounts()
  return total > 0 ? Math.round((done / total) * 100) : null
}

/** "Website redesign" → "WR", "Billing" → "BIL" */
export function suggestProjectKey(name) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean)
  if (words.length === 0) return ""
  if (words.length === 1) return words[0].slice(0, 3)
  return words.map((word) => word[0]).join("").slice(0, 4)
}

export function projectFromApi(data) {
  const counts = data.issue_counts ?? {}
  return {
    id: String(data.id),
    workspaceId: String(data.workspace),
    key: data.key,
    name: data.name,
    description: data.description ?? "",
    status: data.status,
    phase: data.phase ?? "planning",
    targetDate: data.target_date ?? null,
    visibility: data.visibility,
    leadId: data.lead == null ? null : String(data.lead.id ?? data.lead),
    memberIds: (data.members ?? []).map((m) => String(m.id ?? m)),
    issueCounts: {
      total: counts.total ?? 0,
      done: counts.done ?? 0,
      open: counts.open ?? 0,
      overdue: counts.overdue ?? 0,
      byStatus: counts.by_status ?? {},
      byType: counts.by_type ?? {},
    },
    myRole: data.my_role ?? null,
    permissions: data.permissions ?? [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/** Partial project → DRF payload; only fields present are sent. */
export function projectToApi(values) {
  const fields = {
    name: "name",
    key: "key",
    description: "description",
    visibility: "visibility",
    status: "status",
    phase: "phase",
    targetDate: "target_date",
    leadId: "lead",
  }
  const payload = {}
  for (const [field, apiField] of Object.entries(fields)) {
    if (field in values) payload[apiField] = values[field]
  }
  return payload
}

/** Does the caller hold `perm` in this project? Presentation only. */
export const projectCan = (project, perm) => Boolean(project?.permissions?.includes(perm))

export const projectApiFieldMap = {
  name: "name",
  key: "key",
  description: "description",
  visibility: "visibility",
  status: "status",
  phase: "phase",
  targetDate: "target_date",
  lead: "leadId",
}
