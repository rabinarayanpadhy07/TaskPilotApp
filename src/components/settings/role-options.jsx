import { WORKSPACE_ROLES, workspaceRoleConfig } from "@/models/roles"

/**
 * <option>s for every workspace role. Roles the caller can't grant stay
 * visible but disabled, so people can see what exists and why it's unavailable.
 */
export function RoleOptions({ assignable, current }) {
  return WORKSPACE_ROLES.map((role) => {
    const allowed = assignable.includes(role.value) || role.value === current
    return (
      <option key={role.value} value={role.value} disabled={!allowed}>
        {role.label}
        {allowed ? "" : " (not available to you)"}
      </option>
    )
  })
}

RoleOptions.Description = function RoleDescription({ role }) {
  return workspaceRoleConfig[role]?.description ?? null
}
