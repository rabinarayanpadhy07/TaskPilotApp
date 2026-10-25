import { useMemo } from "react"
import { Plus, SearchX, SquareCheck } from "lucide-react"

import { useMemberMap } from "@/api/hooks"
import { IssueFilterBar } from "@/components/issues/issue-filter-bar"
import { CreateIssueDialog } from "@/components/issues/issue-form"
import { IssueList, IssueListSkeleton, IssueRow } from "@/components/issues/issue-row"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { QueryError } from "@/components/ui/query-error"
import { applyIssueFilters, FILTER_KEYS, ISSUE_FILTER_DEFAULTS, ISSUE_SORTS, sortIssues } from "@/lib/issue-filters"
import { useUrlFilters } from "@/lib/use-url-filters"
import { useProjectPlanning } from "@/pages/project/use-project-planning"
import { useRouteProject } from "@/pages/project/use-route-project"

// The issues list defaults to status order; "Manual order" is the board/backlog rank
const SORTS = [ISSUE_SORTS.find((s) => s.value === "status"), ...ISSUE_SORTS.filter((s) => s.value !== "status")]

/**
 * All issues in the project. Filters (status, assignee, priority, type,
 * labels, sprint, epic), search and sort live in the URL so views can be shared.
 */
export function ProjectIssuesTab() {
  const { data: project } = useRouteProject()
  const planning = useProjectPlanning(project)
  const memberMap = useMemberMap()
  const filters = useUrlFilters(ISSUE_FILTER_DEFAULTS)
  const { values, clear } = filters

  const visible = useMemo(
    () => sortIssues(applyIssueFilters(planning.issues, values, { epicOf: planning.epicOf }), values.sort || "status"),
    [planning, values]
  )
  const sprintsById = Object.fromEntries(planning.sprints.map((s) => [s.id, s]))

  if (planning.error) return <QueryError error={planning.error} title="Couldn't load this project's issues" onRetry={planning.retry} />
  if (!planning.isPending && planning.issues.length === 0) {
    return (
      <EmptyState
        variant="bordered"
        icon={SquareCheck}
        title="No issues yet"
        description="Create the first epic, story, task or bug for this project."
        action={
          <CreateIssueDialog defaults={{ projectId: project.id }}>
            <Button>
              <Plus />
              Create issue
            </Button>
          </CreateIssueDialog>
        }
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <IssueFilterBar
        filters={filters}
        context={{ members: planning.members, labels: planning.labels, sprints: planning.sprints, epics: planning.epics }}
        sortable
        sortOptions={SORTS}
        trailing={
          <span className="text-sm text-muted-foreground" role="status">
            {planning.isPending ? "" : `${visible.length} of ${planning.issues.length} issues`}
          </span>
        }
      />

      {planning.isPending ? (
        <IssueListSkeleton rows={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={SearchX}
          title="No issues match your filters"
          description="Try a different search, or remove a filter chip above."
          action={
            <Button variant="secondary" onClick={() => clear(FILTER_KEYS)}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <IssueList label={`${project.name} issues`}>
          {visible.map((issue) => (
            <li key={issue.id}>
              <IssueRow issue={issue} assignee={memberMap[issue.assigneeId]} context={sprintsById[issue.sprintId]?.name} />
            </li>
          ))}
        </IssueList>
      )}
    </div>
  )
}
