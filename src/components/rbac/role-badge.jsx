import { Badge } from "@/components/ui/badge"
import { projectRoleLabel, workspaceRoleConfig, workspaceRoleLabel } from "@/models/roles"

export function RoleBadge({ role, className }) {
  if (!role) return null
  return (
    <Badge variant={workspaceRoleConfig[role]?.variant ?? "neutral"} className={className}>
      {workspaceRoleLabel(role)}
    </Badge>
  )
}

export function ProjectRoleBadge({ role, className }) {
  if (!role) return null
  return (
    <Badge variant={role === "manager" ? "primary" : "outline"} className={className}>
      {projectRoleLabel(role)}
    </Badge>
  )
}
