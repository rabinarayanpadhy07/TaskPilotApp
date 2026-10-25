import { useCallback, useEffect, useMemo } from "react"
import { CalendarPlus, ExternalLink, Pencil, Play } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { useMemberMap, useMoveIssue } from "@/api/hooks"
import { BacklogView } from "@/components/backlog/backlog-view"
import { BulkActionBar } from "@/components/backlog/bulk-action-bar"
import { IssueFilterBar } from "@/components/issues/issue-filter-bar"
import { IssuePanel } from "@/components/issues/issue-panel"
import { useIssuePanel } from "@/components/issues/use-issue-panel"
import {
  CompleteSprintDialog,
  SprintDates,
  SprintFormDialog,
  SprintStats,
  SprintStatusBadge,
  StartSprintDialog,
} from "@/components/sprints/sprint-dialogs"
import { Button } from "@/components/ui/button"
import { QueryError } from "@/components/ui/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { parseApiError } from "@/lib/api-errors"
import { applyIssueFilters, ISSUE_FILTER_DEFAULTS } from "@/lib/issue-filters"
import { paths } from "@/lib/routes"
import { useUrlFilters } from "@/lib/use-url-filters"
import { cn } from "@/lib/utils"
import { PLANNABLE_TYPES } from "@/models/issue"
import { usePlanningStore } from "@/stores/planning-store"
import { useProjectPlanning } from "@/pages/project/use-project-planning"
import { useRouteProject } from "@/pages/project/use-route-project"

const BACKLOG = "backlog"
const NO_EPIC = "no-epic"

function GroupByToggle({ value, onChange }) {
  return (
    <div role="group" aria-label="Group by" className="inline-flex items-center rounded-md border bg-surface p-0.5 shadow-xs">
      <span className="px-2 text-xs text-muted-foreground">Group by</span>
      {[
        { value: "sprint", label: "Sprint" },
        { value: "epic", label: "Epic" },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "focus-ring h-7 cursor-pointer rounded-[5px] px-3 text-sm font-medium transition-colors",
            value === option.value ? "bg-selected text-selected-foreground" : "text-muted-foreground hover:bg-hover hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Next sprint name, e.g. "WEB Sprint 4". */
function suggestSprintName(project, sprints) {
  const numbers = sprints.map((s) => Number(s.name.match(/(\d+)\s*$/)?.[1] ?? 0))
  return `${project.key} Sprint ${Math.max(0, ...numbers) + 1}`
}

export function ProjectBacklogTab() {
  const { data: project } = useRouteProject()
  const planning = useProjectPlanning(project)
  const memberMap = useMemberMap()
  const moveIssue = useMoveIssue()
  const filters = useUrlFilters(ISSUE_FILTER_DEFAULTS)
  const panel = useIssuePanel()
  const { backlogGroupBy: groupBy, setBacklogGroupBy, selectedKeys, clearSelection } = usePlanningStore()

  // Selection is per visit: clear it when leaving the backlog
  useEffect(() => clearSelection, [clearSelection])

  const { sprints, openSprints, plannedSprints, activeSprint, epics } = planning
  const openSprintIds = useMemo(() => new Set(openSprints.map((s) => s.id)), [openSprints])
  const epicsById = useMemo(() => Object.fromEntries(epics.map((e) => [e.id, e])), [epics])

  // Issues in completed sprints are history, not backlog
  const issues = useMemo(
    () =>
      applyIssueFilters(
        planning.plannable.filter((issue) => !issue.sprintId || openSprintIds.has(issue.sprintId)),
        filters.values,
        { epicOf: planning.epicOf }
      ),
    [planning, openSprintIds, filters.values]
  )

  const sectionOf = useCallback(
    (issue) => (groupBy === "epic" ? (epicsById[issue.parentId] ? issue.parentId : NO_EPIC) : (issue.sprintId ?? BACKLOG)),
    [groupBy, epicsById]
  )
  const changeFor = useCallback(
    (sectionId) =>
      groupBy === "epic" ? { parentId: sectionId === NO_EPIC ? null : sectionId } : { sprintId: sectionId === BACKLOG ? null : sectionId },
    [groupBy]
  )

  const sections = useMemo(() => {
    if (groupBy === "epic") {
      return [
        ...epics.map((epic) => ({
          id: epic.id,
          title: `${epic.key} · ${epic.title}`,
          actions: (
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link to={paths.issue(epic)}>
                <ExternalLink />
                <span className="hidden sm:inline">Open epic</span>
              </Link>
            </Button>
          ),
          createDefaults: { projectId: project.id, parentId: epic.id, type: "story" },
          emptyText: "No issues in this epic. Drag issues here to add them.",
        })),
        { id: NO_EPIC, title: "No epic", createDefaults: { projectId: project.id, type: "task" } },
      ]
    }
    return [
      ...openSprints.map((sprint) => ({
        id: sprint.id,
        title: sprint.name,
        badge: <SprintStatusBadge status={sprint.status} />,
        meta: <SprintDates sprint={sprint} className="text-xs text-muted-foreground" />,
        progress: sprint.status === "active" ? <SprintStats sprint={sprint} compact /> : null,
        actions: (
          <>
            {sprint.status === "planned" && (
              <StartSprintDialog sprint={sprint} otherSprints={sprints.filter((s) => s.id !== sprint.id)} activeSprint={activeSprint}>
                <Button variant="secondary" size="sm">
                  <Play />
                  Start
                </Button>
              </StartSprintDialog>
            )}
            {sprint.status === "active" && (
              <CompleteSprintDialog sprint={sprint} plannedSprints={plannedSprints}>
                <Button variant="secondary" size="sm">
                  Complete
                </Button>
              </CompleteSprintDialog>
            )}
            <SprintFormDialog projectId={project.id} sprint={sprint} otherSprints={sprints.filter((s) => s.id !== sprint.id)}>
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${sprint.name}`} className="text-muted-foreground">
                <Pencil />
              </Button>
            </SprintFormDialog>
          </>
        ),
        createDefaults: { projectId: project.id, sprintId: sprint.id, type: "task" },
        emptyText: "Plan this sprint by dragging issues here from the backlog.",
      })),
      { id: BACKLOG, title: "Backlog", createDefaults: { projectId: project.id, type: "task" }, emptyText: "The backlog is empty." },
    ]
  }, [groupBy, epics, openSprints, sprints, plannedSprints, activeSprint, project.id])

  function handleMove(move, done) {
    moveIssue.mutate(move, {
      onError: (error) => toast.error(`Couldn't move ${move.key}`, { description: `${parseApiError(error).message} The backlog was restored.` }),
      onSettled: done,
    })
  }

  if (planning.error) return <QueryError error={planning.error} title="Couldn't load this project's issues" onRetry={planning.retry} />
  if (planning.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4" aria-busy="true" aria-label="Loading backlog">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <GroupByToggle value={groupBy} onChange={setBacklogGroupBy} />
        <SprintFormDialog projectId={project.id} otherSprints={sprints} suggestedName={suggestSprintName(project, sprints)}>
          <Button variant="secondary" size="sm" className="ml-auto">
            <CalendarPlus />
            Create sprint
          </Button>
        </SprintFormDialog>
      </div>

      <IssueFilterBar
        filters={filters}
        fields={["assignee", "type", "priority", "label", groupBy === "sprint" ? "epic" : "sprint"]}
        context={{ members: planning.members, labels: planning.labels, epics, sprints: openSprints, types: PLANNABLE_TYPES }}
        trailing={<span className="text-sm text-muted-foreground">{issues.length} issues</span>}
      />

      <BacklogView
        projectId={project.id}
        issues={issues}
        sections={sections}
        sectionOf={sectionOf}
        changeFor={changeFor}
        memberMap={memberMap}
        epicsById={epicsById}
        groupBy={groupBy}
        openKey={panel.openKey}
        onOpen={panel.open}
        onMove={handleMove}
      />

      <BulkActionBar selectedKeys={selectedKeys} onClear={clearSelection} sprints={openSprints} members={planning.members} />
      <IssuePanel issueKey={panel.openKey} onClose={panel.close} />
    </div>
  )
}
