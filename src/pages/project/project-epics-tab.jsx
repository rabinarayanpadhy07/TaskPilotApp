import { useState } from "react"
import { ChevronRight, ExternalLink, Pencil, Plus, Zap } from "lucide-react"
import { Link } from "react-router"

import { useMemberMap } from "@/api/hooks"
import { EpicDialog } from "@/components/epics/epic-dialog"
import { IssueTypeIcon, StatusBadge } from "@/components/issues/issue-badges"
import { CreateIssueDialog } from "@/components/issues/issue-form"
import { DueDate, IssueRow } from "@/components/issues/issue-row"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Progress } from "@/components/ui/progress"
import { QueryError } from "@/components/ui/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { paths } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { isDone, isPlannable } from "@/models/issue"
import { byRank } from "@/models/rank"
import { useProjectPlanning } from "@/pages/project/use-project-planning"
import { useRouteProject } from "@/pages/project/use-route-project"

/** Progress from an epic's stories, tasks and bugs (subtasks roll up into their parents). */
function epicStats(children) {
  const done = children.filter(isDone)
  return {
    total: children.length,
    done: done.length,
    points: children.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    donePoints: done.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    progress: children.length ? Math.round((done.length / children.length) * 100) : null,
  }
}

function EpicCard({ epic, childIssues, memberMap, projectId }) {
  const [expanded, setExpanded] = useState(false)
  const stats = epicStats(childIssues)
  const owner = memberMap[epic.assigneeId]
  const listId = `epic-children-${epic.id}`

  return (
    <li className="overflow-hidden rounded-lg border bg-card shadow-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="focus-ring flex min-w-0 flex-1 basis-64 cursor-pointer items-center gap-3 rounded-md text-left"
        >
          <ChevronRight aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} />
          <IssueTypeIcon type="epic" size="lg" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{epic.title}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{epic.key}</span>
              <span>
                {stats.total} {stats.total === 1 ? "issue" : "issues"}
              </span>
            </span>
          </span>
        </button>
        <div className="grid w-full grid-cols-1 gap-1.5 sm:w-56">
          <Progress value={stats.progress} label={`${epic.title} progress`} tone={stats.progress === 100 ? "success" : "primary"} />
          <span className="text-xs text-muted-foreground">
            {stats.total === 0 ? "No child issues yet" : `${stats.done} of ${stats.total} done`}
            {stats.points > 0 && ` · ${stats.donePoints}/${stats.points} pts`}
            {stats.progress != null && <span className="ml-1 font-medium text-foreground tabular-nums">{stats.progress}%</span>}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={epic.status} />
          {epic.dueDate && <DueDate value={epic.dueDate} done={isDone(epic)} />}
          {owner ? <UserAvatar name={owner.name} size="sm" title={`Owner: ${owner.name}`} /> : null}
          <EpicDialog projectId={projectId} epic={epic}>
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${epic.key}`} className="text-muted-foreground">
              <Pencil />
            </Button>
          </EpicDialog>
          <Button variant="ghost" size="icon-sm" aria-label={`Open ${epic.key}`} className="text-muted-foreground" asChild>
            <Link to={paths.issue(epic)}>
              <ExternalLink />
            </Link>
          </Button>
        </div>
      </div>
      <div id={listId} hidden={!expanded} className="border-t bg-background/40">
        {childIssues.length > 0 ? (
          <ul aria-label={`Issues in ${epic.title}`} className="divide-y">
            {childIssues.map((issue) => (
              <li key={issue.id}>
                <IssueRow issue={issue} assignee={memberMap[issue.assigneeId]} density="compact" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-muted-foreground">No issues in this epic yet.</p>
        )}
        <div className="border-t px-3 py-1.5">
          <CreateIssueDialog defaults={{ projectId, parentId: epic.id, type: "story" }}>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Plus />
              Add issue to epic
            </Button>
          </CreateIssueDialog>
        </div>
      </div>
    </li>
  )
}

export function ProjectEpicsTab() {
  const { data: project } = useRouteProject()
  const planning = useProjectPlanning(project)
  const memberMap = useMemberMap()
  const epics = [...planning.epics].sort(byRank)

  const createButton = (
    <EpicDialog projectId={project.id}>
      <Button>
        <Plus />
        Create epic
      </Button>
    </EpicDialog>
  )

  if (planning.error) return <QueryError error={planning.error} title="Couldn't load this project's issues" onRetry={planning.retry} />
  if (planning.isPending) {
    return (
      <div className="grid grid-cols-1 gap-3" aria-busy="true" aria-label="Loading epics">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    )
  }

  if (epics.length === 0) {
    return (
      <EmptyState
        variant="bordered"
        icon={Zap}
        title="No epics yet"
        description="Epics group stories, tasks and bugs into larger goals and track their progress."
        action={createButton}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Progress counts the stories, tasks and bugs in each epic.</p>
        {createButton}
      </div>
      <ul className="grid grid-cols-1 gap-3" aria-label="Epics">
        {epics.map((epic) => (
          <EpicCard
            key={epic.id}
            epic={epic}
            projectId={project.id}
            memberMap={memberMap}
            childIssues={planning.issues.filter((issue) => issue.parentId === epic.id && isPlannable(issue)).sort(byRank)}
          />
        ))}
      </ul>
    </div>
  )
}
