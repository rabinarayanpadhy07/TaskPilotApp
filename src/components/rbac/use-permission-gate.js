import { useProject, useProjects } from "@/api/hooks"
import { restrictedReasons } from "@/components/rbac/reasons"
import { projectCan } from "@/models/project"
import { PERMS } from "@/models/roles"

/**
 * Why the caller can't do `perm` in a project (for a disabled control's
 * tooltip), or null when they can or the project isn't loaded yet. Display
 * only: the API decides.
 */
export function useProjectGate(projectId, perm, reason) {
  const { data: project } = useProject(projectId)
  if (!projectId || !project) return null
  return projectCan(project, perm) ? null : reason
}

/** Creating an issue: in `projectId`, or in any project when none is preset. */
export function useCreateIssueGate(projectId) {
  const { data: projects } = useProjects()
  const scoped = useProjectGate(projectId, PERMS.issuesWrite, restrictedReasons.writeIssues)
  if (projectId) return scoped
  if (!projects || projects.length === 0) return null
  return projects.some((p) => projectCan(p, PERMS.issuesWrite)) ? null : restrictedReasons.writeAnyProject
}
