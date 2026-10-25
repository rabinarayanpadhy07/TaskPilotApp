/**
 * Workspace content from the Django REST API. Used only through the TanStack
 * Query hooks in src/api/hooks.js. Responses are mapped to the shared models
 * in src/models/. Permissions are enforced by the API: a 403 surfaces as an
 * error in the UI, and `permissions` flags only shape the interface.
 */
import { endpoints } from "@/api/endpoints"
import { apiClient } from "@/lib/api-client"
import { attachmentFromApi, activityFromApi, commentFromApi, issueFromApi, issueToApi } from "@/models/issue"
import { notificationFromApi } from "@/models/notification"
import { projectFromApi, projectToApi } from "@/models/project"
import { reportFromApi } from "@/models/report"
import { invitationFromApi, memberFromApi, projectMemberFromApi } from "@/models/roles"
import { sprintFromApi, sprintToApi } from "@/models/sprint"

/** Rows of a paginated ({ results }) or plain-list DRF response. */
const list = (data) => (Array.isArray(data) ? data : (data.results ?? []))
const get = (url, config) => apiClient.get(url, config).then(({ data }) => data)

const PAGE_SIZE = 200
/** Hard stop so a runaway list can't loop forever (200 × 50 = 10,000 rows). */
const MAX_PAGES = 50

/**
 * Every row of a paginated list endpoint, following `next` links. For screens
 * that need a complete list (a project's board, the member directory).
 */
async function getAll(url, params = {}) {
  const rows = []
  let page = 1
  while (page <= MAX_PAGES) {
    const data = await get(url, { params: { ...params, page, page_size: PAGE_SIZE } })
    rows.push(...list(data))
    if (Array.isArray(data) || !data.next) break
    page += 1
  }
  return rows
}

/** `role`, `permissions` and `assignableRoles` describe the caller; the API enforces them. */
function toWorkspace(ws) {
  return {
    id: String(ws.id),
    name: ws.name,
    slug: ws.slug ?? "",
    memberIds: (ws.member_ids ?? []).map(String),
    role: ws.role ?? null,
    permissions: ws.permissions ?? [],
    assignableRoles: ws.assignable_roles ?? [],
  }
}

export const workspaceDataService = {
  async getWorkspaces() {
    return (await getAll(endpoints.workspaces.list)).map(toWorkspace)
  },

  /** PATCH /workspaces/:ws/ { name, slug }: needs workspace.update (owners, admins). */
  async updateWorkspace(workspaceId, { name, slug }) {
    const { data } = await apiClient.patch(endpoints.workspaces.detail(workspaceId), { name, slug })
    return toWorkspace(data)
  },

  async getMembers(workspaceId) {
    return (await getAll(endpoints.workspaces.members(workspaceId))).map(memberFromApi)
  },

  // ----- Access management (authorized by the API on every call) -----

  async updateMemberRole(workspaceId, userId, role) {
    const { data } = await apiClient.patch(endpoints.workspaces.member(workspaceId, userId), { role })
    return memberFromApi(data)
  },

  /** Removes someone, or leaves the workspace when `userId` is the caller. */
  async removeMember(workspaceId, userId) {
    await apiClient.delete(endpoints.workspaces.member(workspaceId, userId))
    return { ok: true }
  },

  async getInvitations(workspaceId) {
    return (await getAll(endpoints.workspaces.invitations(workspaceId))).map(invitationFromApi)
  },

  /** The response includes `inviteUrl` once, so the inviter can share the link. */
  async createInvitation(workspaceId, { email, role }) {
    const { data } = await apiClient.post(endpoints.workspaces.invitations(workspaceId), { email, role })
    return invitationFromApi(data)
  },

  async revokeInvitation(workspaceId, invitationId) {
    await apiClient.delete(endpoints.workspaces.invitation(workspaceId, invitationId))
    return { ok: true }
  },

  async getProjectMembers(workspaceId, projectId) {
    return (await getAll(endpoints.projects.members(workspaceId, projectId))).map(projectMemberFromApi)
  },

  async addProjectMember(workspaceId, projectId, { userId, role }) {
    const { data } = await apiClient.post(endpoints.projects.members(workspaceId, projectId), { user: userId, role })
    return projectMemberFromApi(data)
  },

  async updateProjectMember(workspaceId, projectId, userId, { role }) {
    const { data } = await apiClient.patch(endpoints.projects.member(workspaceId, projectId, userId), { role })
    return projectMemberFromApi(data)
  },

  async removeProjectMember(workspaceId, projectId, userId) {
    await apiClient.delete(endpoints.projects.member(workspaceId, projectId, userId))
    return { ok: true }
  },

  // ----- Reports -----

  /** Aggregated server-side over the projects the caller can see. */
  async getReport(workspaceId, { projectId, from, to } = {}) {
    const data = await get(endpoints.workspaces.reports(workspaceId), {
      params: { project: projectId || undefined, from, to },
    })
    return reportFromApi(data)
  },

  async getTeams(workspaceId) {
    return (await getAll(endpoints.workspaces.teams(workspaceId))).map((team) => ({
      id: String(team.id),
      workspaceId: String(workspaceId),
      name: team.name,
      memberIds: (team.member_ids ?? []).map(String),
    }))
  },

  async getNotifications(workspaceId) {
    // The inbox shows the latest 100; older ones stay on the server
    const data = await get(endpoints.notifications.list, { params: { workspace: workspaceId, page_size: 100 } })
    return list(data).map((n) => notificationFromApi(n, workspaceId))
  },

  /** Pass ids, or nothing to mark everything in the workspace as read. */
  async markNotificationsRead(workspaceId, ids) {
    await apiClient.post(endpoints.notifications.markRead, { workspace: workspaceId, ids: ids ?? null })
    return { ok: true }
  },

  async markNotificationUnread(workspaceId, id) {
    await apiClient.post(endpoints.notifications.markUnread(id))
    return { ok: true }
  },

  // ----- Projects -----

  async getProjects(workspaceId) {
    return (await getAll(endpoints.projects.list(workspaceId))).map(projectFromApi)
  },

  async createProject(workspaceId, values) {
    const { data } = await apiClient.post(endpoints.projects.list(workspaceId), projectToApi(values))
    return projectFromApi(data)
  },

  async updateProject(workspaceId, projectId, patch) {
    const { data } = await apiClient.patch(endpoints.projects.detail(workspaceId, projectId), projectToApi(patch))
    return projectFromApi(data)
  },

  // ----- Issues -----

  async getLabels(workspaceId) {
    return list(await get(endpoints.workspaces.labels(workspaceId))).map((label) => label.name ?? label)
  },

  /** Server-side filters: project, assignee, dueBefore (YYYY-MM-DD) and open (not done). */
  async getIssues(workspaceId, { projectId, assigneeId, dueBefore, open } = {}) {
    const rows = await getAll(endpoints.issues.list(workspaceId), {
      project: projectId || undefined,
      assignee: assigneeId || undefined,
      due_before: dueBefore || undefined,
      open: open == null ? undefined : String(open),
    })
    return rows.map(issueFromApi)
  },

  async getIssue(workspaceId, key) {
    return issueFromApi(await get(endpoints.issues.detail(workspaceId, key)))
  },

  async createIssue(workspaceId, values) {
    const { data } = await apiClient.post(endpoints.issues.list(workspaceId), issueToApi(values))
    return issueFromApi(data)
  },

  /** PATCH with only the changed fields. */
  async updateIssue(workspaceId, key, patch) {
    const { data } = await apiClient.patch(endpoints.issues.detail(workspaceId, key), issueToApi(patch))
    return issueFromApi(data)
  },

  /**
   * Drag-and-drop move. The server validates the change, checks permissions,
   * assigns the final rank and returns the updated issue.
   */
  async moveIssue(workspaceId, key, { status, sprintId, parentId, beforeKey = null, afterKey = null }) {
    const payload = { before: beforeKey, after: afterKey }
    if (status !== undefined) payload.status = status
    if (sprintId !== undefined) payload.sprint = sprintId
    if (parentId !== undefined) payload.parent = parentId
    const { data } = await apiClient.post(endpoints.issues.move(workspaceId, key), payload)
    return issueFromApi(data)
  },

  /** One transaction on the server: all issues change or none do. */
  async bulkUpdateIssues(workspaceId, keys, changes) {
    const { data } = await apiClient.post(endpoints.issues.bulk(workspaceId), { keys, changes: issueToApi(changes) })
    return list(data).map(issueFromApi)
  },

  // ----- Sprints -----

  async getSprints(workspaceId, projectId) {
    return (await getAll(endpoints.projects.sprints(workspaceId, projectId))).map(sprintFromApi)
  },

  async createSprint(workspaceId, projectId, values) {
    const { data } = await apiClient.post(endpoints.projects.sprints(workspaceId, projectId), sprintToApi(values))
    return sprintFromApi(data)
  },

  async updateSprint(workspaceId, sprintId, values) {
    const { data } = await apiClient.patch(endpoints.sprints.detail(workspaceId, sprintId), sprintToApi(values))
    return sprintFromApi(data)
  },

  async startSprint(workspaceId, sprintId, values) {
    const { data } = await apiClient.post(endpoints.sprints.start(workspaceId, sprintId), sprintToApi({ name: undefined, ...values }))
    return sprintFromApi(data)
  },

  async completeSprint(workspaceId, sprintId, { moveOpenIssuesTo = null } = {}) {
    const { data } = await apiClient.post(endpoints.sprints.complete(workspaceId, sprintId), { move_open_issues_to: moveOpenIssuesTo })
    return sprintFromApi(data)
  },

  // ----- Search -----

  /** Debounced by the caller (see useWorkspaceSearch). */
  async search(workspaceId, query, { limit = 8 } = {}) {
    const data = await get(endpoints.workspaces.search(workspaceId), { params: { q: query, limit } })
    return {
      projects: (data.projects ?? []).map(projectFromApi),
      issues: (data.issues ?? []).map(issueFromApi),
      members: (data.members ?? []).map(memberFromApi),
    }
  },

  // ----- Comments -----

  async getComments(workspaceId, key) {
    return (await getAll(endpoints.issues.comments(workspaceId, key))).map(commentFromApi)
  },

  async addComment(workspaceId, key, { body }) {
    const { data } = await apiClient.post(endpoints.issues.comments(workspaceId, key), { body })
    return commentFromApi(data)
  },

  async editComment(workspaceId, key, commentId, { body }) {
    const { data } = await apiClient.patch(endpoints.issues.comment(workspaceId, key, commentId), { body })
    return commentFromApi(data)
  },

  async deleteComment(workspaceId, key, commentId) {
    await apiClient.delete(endpoints.issues.comment(workspaceId, key, commentId))
    return { ok: true }
  },

  // ----- Activity -----

  async getIssueActivity(workspaceId, key) {
    return (await getAll(endpoints.issues.activity(workspaceId, key))).map(activityFromApi)
  },

  async getWorkspaceActivity(workspaceId, { limit = 20 } = {}) {
    return list(await get(endpoints.workspaces.activity(workspaceId), { params: { page_size: limit } })).map(activityFromApi)
  },

  // ----- Attachments -----

  async getAttachments(workspaceId, key) {
    return (await getAll(endpoints.issues.attachments(workspaceId, key))).map(attachmentFromApi)
  },

  /** multipart/form-data upload with progress reporting. */
  async uploadAttachment(workspaceId, key, file, { onProgress } = {}) {
    const form = new FormData()
    form.append("file", file)
    const { data } = await apiClient.post(endpoints.issues.attachments(workspaceId, key), form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
      },
    })
    return attachmentFromApi(data)
  },

  async deleteAttachment(workspaceId, key, attachmentId) {
    await apiClient.delete(endpoints.issues.attachment(workspaceId, key, attachmentId))
    return { ok: true }
  },
}
