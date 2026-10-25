import { useMemo } from "react"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"

import { useMemberMap, useMoveIssue } from "@/api/hooks"
import { KanbanBoard } from "@/components/board/kanban-board"
import { IssueFilterBar } from "@/components/issues/issue-filter-bar"
import { IssuePanel } from "@/components/issues/issue-panel"
import { useIssuePanel } from "@/components/issues/use-issue-panel"
import { CompleteSprintDialog, SprintDates, SprintStats } from "@/components/sprints/sprint-dialogs"
import { Button } from "@/components/ui/button"
import { QueryError } from "@/components/ui/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { parseApiError } from "@/lib/api-errors"
import { applyIssueFilters, ISSUE_FILTER_DEFAULTS } from "@/lib/issue-filters"
import { paths } from "@/lib/routes"
import { useUrlFilters } from "@/lib/use-url-filters"
import { cn } from "@/lib/utils"
import { PLANNABLE_TYPES } from "@/models/issue"
import { useProjectPlanning } from "@/pages/project/use-project-planning"
import { useRouteProject } from "@/pages/project/use-route-project"

function ScopeToggle({ scope, onChange, sprintName }) {
  const options = [
    { value: "sprint", label: sprintName },
    { value: "all", label: "All issues" },
  ]
  return (
    <div role="group" aria-label="Board scope" className="inline-flex rounded-md border bg-surface p-0.5 shadow-xs">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={scope === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "focus-ring h-7 max-w-48 cursor-pointer truncate rounded-[5px] px-3 text-sm font-medium transition-colors",
            scope === option.value ? "bg-selected text-selected-foreground" : "text-muted-foreground hover:bg-hover hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Kanban board. Shows the active sprint when there is one (switchable to all
 * issues); projects without sprints show every story, task and bug that isn't
 * in Backlog status.
 */
export function ProjectBoardTab() {
  const { data: project } = useRouteProject()
  const planning = useProjectPlanning(project)
  const memberMap = useMemberMap()
  const moveIssue = useMoveIssue()
  const filters = useUrlFilters(ISSUE_FILTER_DEFAULTS)
  const [params, setParams] = useSearchParams()
  const panel = useIssuePanel()

  const { activeSprint, plannedSprints } = planning
  const scope = activeSprint && params.get("scope") !== "all" ? "sprint" : "all"

  const visible = useMemo(() => {
    const inScope = planning.plannable.filter((issue) =>
      scope === "sprint" ? issue.sprintId === activeSprint?.id : issue.status !== "backlog"
    )
    return applyIssueFilters(inScope, filters.values, { epicOf: planning.epicOf })
  }, [planning, scope, activeSprint, filters.values])

  function handleMove(move, done) {
    moveIssue.mutate(move, {
      onError: (error) => toast.error(`Couldn't move ${move.key}`, { description: `${parseApiError(error).message} The board was restored.` }),
      onSettled: done,
    })
  }

  if (planning.error) return <QueryError error={planning.error} title="Couldn't load this project's issues" onRetry={planning.retry} />
  if (planning.isPending) {
    return (
      <div className="flex gap-3 overflow-hidden" aria-busy="true" aria-label="Loading board">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-xl sm:flex-1" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {activeSprint ? (
          <>
            <ScopeToggle
              scope={scope}
              sprintName={activeSprint.name}
              onChange={(next) =>
                setParams(
                  () => {
                    const p = new URLSearchParams(window.location.search)
                    if (next === "all") p.set("scope", "all")
                    else p.delete("scope")
                    return p
                  },
                  { replace: true, flushSync: true }
                )
              }
            />
            {scope === "sprint" && (
              <div className="flex min-w-0 flex-1 basis-72 flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-48 flex-1 sm:max-w-sm">
                  <SprintStats sprint={activeSprint} compact />
                </div>
                <SprintDates sprint={activeSprint} className="text-xs text-muted-foreground" />
                <CompleteSprintDialog sprint={activeSprint} plannedSprints={plannedSprints}>
                  <Button variant="secondary" size="sm" className="ml-auto">
                    Complete sprint
                  </Button>
                </CompleteSprintDialog>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active sprint, so the board shows all stories, tasks and bugs outside the backlog.{" "}
            <Link to={`${paths.project(project.id)}/backlog`} className="focus-ring rounded-sm font-medium text-primary hover:underline">
              Plan a sprint
            </Link>
          </p>
        )}
      </div>
      {scope === "sprint" && activeSprint?.goal && (
        <p className="-mt-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Goal:</span> {activeSprint.goal}
        </p>
      )}

      <IssueFilterBar
        filters={filters}
        fields={["assignee", "type", "priority", "label", "epic"]}
        context={{ members: planning.members, labels: planning.labels, epics: planning.epics, types: PLANNABLE_TYPES }}
        trailing={<span className="text-sm text-muted-foreground" role="status">{visible.length} issues</span>}
      />

      <KanbanBoard
        issues={visible}
        memberMap={memberMap}
        subtaskCounts={planning.subtaskCounts}
        selectedKey={panel.openKey}
        onOpen={panel.open}
        onMove={handleMove}
        createDefaults={{ projectId: project.id, sprintId: scope === "sprint" ? activeSprint?.id : null, type: "task" }}
      />

      <IssuePanel issueKey={panel.openKey} onClose={panel.close} />
    </div>
  )
}
