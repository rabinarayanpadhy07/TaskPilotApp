/**
 * Django REST Framework endpoints, relative to API_BASE_URL.
 * Request/response shapes: docs/auth-api.md and docs/workspace-api.md.
 */
const ws = (workspaceId) => `/workspaces/${encodeURIComponent(workspaceId)}`
const issue = (workspaceId, key) => `${ws(workspaceId)}/issues/${encodeURIComponent(key)}`

export const endpoints = {
  auth: {
    register: "/auth/register/",
    login: "/auth/login/",
    refresh: "/auth/token/refresh/",
    logout: "/auth/logout/",
    me: "/auth/me/",
    passwordChange: "/auth/password/change/",
    passwordReset: "/auth/password-reset/",
    passwordResetConfirm: "/auth/password-reset/confirm/",
  },
  workspaces: {
    list: "/workspaces/",
    create: "/workspaces/",
    detail: (workspaceId) => `${ws(workspaceId)}/`,
    members: (workspaceId) => `${ws(workspaceId)}/members/`,
    member: (workspaceId, userId) => `${ws(workspaceId)}/members/${encodeURIComponent(userId)}/`,
    invitations: (workspaceId) => `${ws(workspaceId)}/invitations/`,
    invitation: (workspaceId, id) => `${ws(workspaceId)}/invitations/${encodeURIComponent(id)}/`,
    reports: (workspaceId) => `${ws(workspaceId)}/reports/`,
    teams: (workspaceId) => `${ws(workspaceId)}/teams/`,
    labels: (workspaceId) => `${ws(workspaceId)}/labels/`,
    activity: (workspaceId) => `${ws(workspaceId)}/activity/`,
    search: (workspaceId) => `${ws(workspaceId)}/search/`,
  },
  notifications: {
    list: "/notifications/",
    markRead: "/notifications/mark-read/",
    markUnread: (id) => `/notifications/${encodeURIComponent(id)}/mark-unread/`,
  },
  projects: {
    list: (workspaceId) => `${ws(workspaceId)}/projects/`,
    detail: (workspaceId, projectId) => `${ws(workspaceId)}/projects/${encodeURIComponent(projectId)}/`,
    members: (workspaceId, projectId) => `${ws(workspaceId)}/projects/${encodeURIComponent(projectId)}/members/`,
    member: (workspaceId, projectId, userId) =>
      `${ws(workspaceId)}/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}/`,
    sprints: (workspaceId, projectId) => `${ws(workspaceId)}/projects/${encodeURIComponent(projectId)}/sprints/`,
  },
  sprints: {
    detail: (workspaceId, id) => `${ws(workspaceId)}/sprints/${encodeURIComponent(id)}/`,
    start: (workspaceId, id) => `${ws(workspaceId)}/sprints/${encodeURIComponent(id)}/start/`,
    complete: (workspaceId, id) => `${ws(workspaceId)}/sprints/${encodeURIComponent(id)}/complete/`,
  },
  issues: {
    list: (workspaceId) => `${ws(workspaceId)}/issues/`,
    bulk: (workspaceId) => `${ws(workspaceId)}/issues/bulk/`,
    detail: (workspaceId, key) => `${issue(workspaceId, key)}/`,
    move: (workspaceId, key) => `${issue(workspaceId, key)}/move/`,
    comments: (workspaceId, key) => `${issue(workspaceId, key)}/comments/`,
    comment: (workspaceId, key, id) => `${issue(workspaceId, key)}/comments/${encodeURIComponent(id)}/`,
    activity: (workspaceId, key) => `${issue(workspaceId, key)}/activity/`,
    attachments: (workspaceId, key) => `${issue(workspaceId, key)}/attachments/`,
    attachment: (workspaceId, key, id) => `${issue(workspaceId, key)}/attachments/${encodeURIComponent(id)}/`,
  },
  invitations: {
    detail: (token) => `/invitations/${encodeURIComponent(token)}/`,
    accept: (token) => `/invitations/${encodeURIComponent(token)}/accept/`,
  },
}
