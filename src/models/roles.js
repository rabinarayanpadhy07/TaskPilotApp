/**
 * Workspace & project roles, for DISPLAY ONLY.
 *
 * The authoritative matrix lives in Django (backend/workspaces/roles.py) and
 * is documented in backend/docs/authorization.md. The API returns the
 * caller's effective `permissions` on workspaces and projects; the UI uses
 * those to show or disable controls. Nothing here grants access: every
 * request is authorized again on the server.
 *
 * The mock data source (src/mocks/mock-api.js) uses this table to play the
 * server's part while the sample data is active.
 *
 * @typedef {"owner"|"admin"|"project_manager"|"developer"|"viewer"} WorkspaceRole
 * @typedef {"manager"|"contributor"|"viewer"} ProjectRole
 */

export const WORKSPACE_ROLES = [
  {
    value: "owner",
    label: "Owner",
    rank: 50,
    variant: "primary",
    description: "Full control, including billing, deleting the workspace and managing other owners.",
  },
  {
    value: "admin",
    label: "Admin",
    rank: 40,
    variant: "primary",
    description: "Manages people, roles and every project. Can't delete the workspace or manage owners.",
  },
  {
    value: "project_manager",
    label: "Project Manager",
    rank: 30,
    variant: "neutral",
    description: "Creates projects and runs the ones they manage: sprints, settings and project members.",
  },
  {
    value: "developer",
    label: "Developer",
    rank: 20,
    variant: "neutral",
    description: "Creates, edits and comments on issues in the projects they can access.",
  },
  {
    value: "viewer",
    label: "Viewer",
    rank: 10,
    variant: "outline",
    description: "Read-only access to the projects they can see, including reports.",
  },
]

export const PROJECT_ROLES = [
  { value: "manager", label: "Manager", rank: 3, description: "Edits project settings, members and sprints." },
  { value: "contributor", label: "Contributor", rank: 2, description: "Creates, edits and comments on issues." },
  { value: "viewer", label: "Viewer", rank: 1, description: "Read-only." },
]

const byValue = (list) => Object.fromEntries(list.map((item) => [item.value, item]))
export const workspaceRoleConfig = byValue(WORKSPACE_ROLES)
export const projectRoleConfig = byValue(PROJECT_ROLES)
export const workspaceRoleLabel = (role) => workspaceRoleConfig[role]?.label ?? role
export const projectRoleLabel = (role) => projectRoleConfig[role]?.label ?? role

/** Permission names, identical to the API's. */
export const PERMS = {
  workspaceView: "workspace.view",
  workspaceUpdate: "workspace.update",
  workspaceDelete: "workspace.delete",
  membersView: "members.view",
  membersInvite: "members.invite",
  membersManage: "members.manage",
  projectsCreate: "projects.create",
  projectsViewAll: "projects.view_all",
  projectsManageAll: "projects.manage_all",
  projectsDelete: "projects.delete",
  reportsView: "reports.view",
  // project level
  projectView: "project.view",
  issuesWrite: "issues.write",
  issuesDelete: "issues.delete",
  issuesComment: "issues.comment",
  sprintsManage: "sprints.manage",
  projectUpdate: "project.update",
  projectMembersManage: "project.members.manage",
}

const ALL_WORKSPACE_PERMS = [
  PERMS.workspaceView, PERMS.workspaceUpdate, PERMS.workspaceDelete, PERMS.membersView, PERMS.membersInvite,
  PERMS.membersManage, PERMS.projectsCreate, PERMS.projectsViewAll, PERMS.projectsManageAll, PERMS.projectsDelete,
  PERMS.reportsView,
]
const BASE = [PERMS.workspaceView, PERMS.membersView, PERMS.reportsView]

export const WORKSPACE_ROLE_PERMISSIONS = {
  owner: ALL_WORKSPACE_PERMS,
  admin: ALL_WORKSPACE_PERMS.filter((perm) => perm !== PERMS.workspaceDelete),
  project_manager: [...BASE, PERMS.projectsCreate],
  developer: BASE,
  viewer: BASE,
}

export const PROJECT_ROLE_PERMISSIONS = {
  manager: [PERMS.projectView, PERMS.issuesWrite, PERMS.issuesDelete, PERMS.issuesComment, PERMS.sprintsManage, PERMS.projectUpdate, PERMS.projectMembersManage],
  contributor: [PERMS.projectView, PERMS.issuesWrite, PERMS.issuesComment],
  viewer: [PERMS.projectView],
}

/** Highest project role each workspace role can hold. */
export const MAX_PROJECT_ROLE = { owner: "manager", admin: "manager", project_manager: "manager", developer: "contributor", viewer: "viewer" }

/** Access to workspace-visible projects without explicit membership. */
export const DEFAULT_PROJECT_ROLE = { owner: "manager", admin: "manager", project_manager: "contributor", developer: "contributor", viewer: "viewer" }

/** Roles a member of `role` may grant. Owners: any; others: only below their own. */
export function assignableRoles(role) {
  if (role === "owner") return WORKSPACE_ROLES.map((r) => r.value)
  const rank = workspaceRoleConfig[role]?.rank ?? 0
  return WORKSPACE_ROLES.filter((r) => r.rank < rank).map((r) => r.value)
}

/** May someone with `actorRole` change or remove someone holding `targetRole`? */
export function canManageRole(actorRole, targetRole) {
  if (actorRole === "owner") return true
  return (workspaceRoleConfig[targetRole]?.rank ?? 99) < (workspaceRoleConfig[actorRole]?.rank ?? 0)
}

export function capProjectRole(projectRole, workspaceRole) {
  const ceiling = MAX_PROJECT_ROLE[workspaceRole]
  return projectRoleConfig[projectRole].rank <= projectRoleConfig[ceiling].rank ? projectRole : ceiling
}

/**
 * Capability rows for the "Roles & permissions" reference table. `roles`
 * lists who has it; `note` qualifies project-scoped abilities.
 */
export const ROLE_CAPABILITIES = [
  {
    group: "Workspace",
    items: [
      { label: "View the workspace, members and reports", roles: ["owner", "admin", "project_manager", "developer", "viewer"] },
      { label: "Invite people and manage invitations", roles: ["owner", "admin"] },
      { label: "Change roles and remove members", roles: ["owner", "admin"], note: "Only for roles below their own; owners manage everyone" },
      { label: "Edit workspace settings", roles: ["owner", "admin"] },
      { label: "Delete the workspace", roles: ["owner"] },
    ],
  },
  {
    group: "Projects",
    items: [
      { label: "Create projects", roles: ["owner", "admin", "project_manager"] },
      { label: "See private projects without being a member", roles: ["owner", "admin"] },
      { label: "Edit project settings, visibility and members", roles: ["owner", "admin", "project_manager"], note: "Project Managers: in projects they manage" },
      { label: "Create, start and complete sprints", roles: ["owner", "admin", "project_manager"], note: "Project Managers: in projects they manage" },
      { label: "Delete projects", roles: ["owner", "admin"] },
    ],
  },
  {
    group: "Issues",
    items: [
      { label: "View issues, boards and sprints", roles: ["owner", "admin", "project_manager", "developer", "viewer"], note: "In projects they can access" },
      { label: "Create, edit, move and comment on issues", roles: ["owner", "admin", "project_manager", "developer"], note: "In projects they can access" },
      { label: "Delete issues", roles: ["owner", "admin", "project_manager"], note: "Project Managers: in projects they manage" },
    ],
  },
]

// ---------- DRF mapping ----------

/** Workspace member (user fields + membership). */
export function memberFromApi(data) {
  return {
    id: String(data.id),
    name: data.full_name || data.email,
    email: data.email,
    title: data.title ?? "",
    role: data.role ?? null,
    joinedAt: data.joined_at ?? null,
    permissions: {
      canChangeRole: Boolean(data.permissions?.can_change_role),
      canRemove: Boolean(data.permissions?.can_remove),
      canLeave: Boolean(data.permissions?.can_leave),
    },
  }
}

export function invitationFromApi(data) {
  return {
    id: String(data.id),
    email: data.email,
    role: data.role,
    invitedBy: data.invited_by ? { id: String(data.invited_by.id), name: data.invited_by.full_name || data.invited_by.email } : null,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    inviteUrl: data.invite_url ?? null,
    permissions: { canRevoke: Boolean(data.permissions?.can_revoke) },
  }
}

export function projectMemberFromApi(data) {
  return {
    id: String(data.id),
    name: data.full_name || data.email,
    email: data.email,
    title: data.title ?? "",
    role: data.role,
    workspaceRole: data.workspace_role ?? null,
    effectiveRole: data.effective_role ?? data.role,
    addedAt: data.added_at ?? null,
  }
}

/** "an Admin", "a Viewer" */
export function roleWithArticle(role) {
  const label = workspaceRoleLabel(role)
  return `${/^[aeiou]/i.test(label) ? "an" : "a"} ${label}`
}
