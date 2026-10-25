import { useMembers, useProject, useSprints, useTeam } from "@/api/hooks"

// Dynamic breadcrumb labels resolve names from the (cached) query data

export function ProjectCrumb({ projectId }) {
  const { data: project } = useProject(projectId)
  return project?.name ?? "Project"
}

export function SprintCrumb({ projectId, sprintId }) {
  const { data: sprints } = useSprints(projectId)
  return sprints?.find((sprint) => sprint.id === sprintId)?.name ?? "Sprint"
}

export function MemberCrumb({ memberId }) {
  const { data: members } = useMembers()
  return members?.find((member) => member.id === memberId)?.name ?? "Member"
}

export function TeamCrumb({ teamId }) {
  const { data: team } = useTeam(teamId)
  return team?.name ?? "Team"
}
