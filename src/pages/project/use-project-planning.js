import { useMemo } from "react"

import { useIssues, useLabels, useMembers, useSprints } from "@/api/hooks"
import { makeEpicResolver } from "@/lib/issue-filters"
import { isDone, isPlannable } from "@/models/issue"

/**
 * Everything the planning views (board, backlog, epics, sprints) need for a
 * project, derived from server data. Nothing here is stored; it's recomputed
 * from the query cache.
 */
export function useProjectPlanning(project) {
  const issuesQuery = useIssues({ projectId: project.id })
  const sprintsQuery = useSprints(project.id)
  const { data: issues = [], isPending: issuesPending } = issuesQuery
  const { data: sprints = [], isPending: sprintsPending } = sprintsQuery
  const error = issuesQuery.error ?? sprintsQuery.error
  const refetch = issuesQuery.refetch
  const refetchSprints = sprintsQuery.refetch
  const { data: allMembers = [] } = useMembers()
  const { data: labels = [] } = useLabels()
  const memberIds = project.memberIds

  return useMemo(() => {
    const issuesById = Object.fromEntries(issues.map((issue) => [issue.id, issue]))
    const epics = issues.filter((issue) => issue.type === "epic")
    const plannable = issues.filter(isPlannable)
    const subtaskCounts = {}
    for (const issue of issues) {
      if (issue.type !== "subtask" || !issue.parentId) continue
      const counts = (subtaskCounts[issue.parentId] ??= { total: 0, done: 0 })
      counts.total += 1
      if (isDone(issue)) counts.done += 1
    }
    return {
      issues,
      issuesById,
      plannable,
      epics,
      sprints,
      activeSprint: sprints.find((sprint) => sprint.status === "active") ?? null,
      plannedSprints: sprints.filter((sprint) => sprint.status === "planned"),
      openSprints: sprints.filter((sprint) => sprint.status !== "completed"),
      members: allMembers.filter((member) => memberIds.includes(member.id)),
      labels,
      subtaskCounts,
      epicOf: makeEpicResolver(issuesById),
      // A failed query is never "pending": callers show `error` instead of an empty state
      isPending: !error && (issuesPending || sprintsPending),
      error,
      retry: () => Promise.all([refetch(), refetchSprints()]),
    }
  }, [issues, sprints, allMembers, labels, memberIds, issuesPending, sprintsPending, error, refetch, refetchSprints])
}
