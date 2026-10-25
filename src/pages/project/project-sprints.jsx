import { CalendarPlus, CalendarRange, Pencil, Play } from "lucide-react"
import { Link, useParams } from "react-router"

import { useMemberMap } from "@/api/hooks"
import { StatusBadge } from "@/components/issues/issue-badges"
import { IssueList, IssueListSkeleton, IssueRow } from "@/components/issues/issue-row"
import {
  CompleteSprintDialog,
  SprintDates,
  SprintFormDialog,
  SprintStats,
  SprintStatusBadge,
  StartSprintDialog,
} from "@/components/sprints/sprint-dialogs"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { QueryError } from "@/components/ui/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/dates"
import { paths } from "@/lib/routes"
import { ISSUE_STATUSES, statusRank } from "@/models/issue"
import { sprintDaysLeft, sprintProgress } from "@/models/sprint"
import { NotFoundPage } from "@/pages/not-found-page"
import { useProjectPlanning } from "@/pages/project/use-project-planning"
import { useRouteProject } from "@/pages/project/use-route-project"

function SprintActions({ sprint, planning, projectId }) {
  const others = planning.sprints.filter((s) => s.id !== sprint.id)
  return (
    <div className="flex items-center gap-2">
      {sprint.status === "planned" && (
        <StartSprintDialog sprint={sprint} otherSprints={others} activeSprint={planning.activeSprint}>
          <Button variant="secondary" size="sm">
            <Play />
            Start sprint
          </Button>
        </StartSprintDialog>
      )}
      {sprint.status === "active" && (
        <CompleteSprintDialog sprint={sprint} plannedSprints={planning.plannedSprints}>
          <Button variant="secondary" size="sm">
            Complete sprint
          </Button>
        </CompleteSprintDialog>
      )}
      {sprint.status !== "completed" && (
        <SprintFormDialog projectId={projectId} sprint={sprint} otherSprints={others}>
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${sprint.name}`} className="text-muted-foreground">
            <Pencil />
          </Button>
        </SprintFormDialog>
      )}
    </div>
  )
}

function SprintCard({ sprint, planning, projectId }) {
  return (
    <li className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`${paths.project(projectId)}/sprints/${sprint.id}`} className="focus-ring rounded-sm text-sm font-semibold hover:text-primary">
              {sprint.name}
            </Link>
            <SprintStatusBadge status={sprint.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <SprintDates sprint={sprint} />
            {sprint.completedAt && ` · completed ${formatDate(sprint.completedAt)}`}
          </p>
        </div>
        <SprintActions sprint={sprint} planning={planning} projectId={projectId} />
      </div>
      {sprint.goal && <p className="text-sm text-foreground">{sprint.goal}</p>}
      <SprintStats sprint={sprint} />
    </li>
  )
}

/** All sprints in the project, grouped by state. */
export function ProjectSprintsTab() {
  const { data: project } = useRouteProject()
  const planning = useProjectPlanning(project)
  const { sprints } = planning

  const createButton = (
    <SprintFormDialog projectId={project.id} otherSprints={sprints} suggestedName={`${project.key} Sprint ${sprints.length + 1}`}>
      <Button>
        <CalendarPlus />
        Create sprint
      </Button>
    </SprintFormDialog>
  )

  if (planning.error) return <QueryError error={planning.error} title="Couldn't load this project's issues" onRetry={planning.retry} />
  if (planning.isPending) return <Skeleton className="h-48 w-full rounded-lg" />
  if (sprints.length === 0) {
    return (
      <EmptyState
        variant="bordered"
        icon={CalendarRange}
        title="No sprints yet"
        description="Sprints are time-boxed iterations. Create one, plan issues into it from the backlog, then start it."
        action={createButton}
      />
    )
  }

  const groups = [
    { status: "active", title: "Active" },
    { status: "planned", title: "Planned" },
    { status: "completed", title: "Completed" },
  ]

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">One sprint can be active at a time. Planned sprints can't overlap.</p>
        {createButton}
      </div>
      {groups.map((group) => {
        const list = sprints.filter((s) => s.status === group.status)
        if (list.length === 0) return null
        return (
          <section key={group.status} aria-labelledby={`sprints-${group.status}`}>
            <h2 id={`sprints-${group.status}`} className="mb-3">
              {group.title} <span className="font-normal text-muted-foreground">· {list.length}</span>
            </h2>
            <ul className="grid grid-cols-1 gap-3">
              {list.map((sprint) => (
                <SprintCard key={sprint.id} sprint={sprint} planning={planning} projectId={project.id} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-xs">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  )
}

/** One sprint: statistics computed from its issues, and the issues themselves. */
export function SprintDetailPage() {
  const { sprintId } = useParams()
  const { data: project } = useRouteProject()
  const planning = useProjectPlanning(project)
  const memberMap = useMemberMap()
  const sprint = planning.sprints.find((s) => s.id === sprintId)

  if (planning.error) return <QueryError error={planning.error} title="Couldn't load this project's issues" onRetry={planning.retry} />
  if (planning.isPending) return <IssueListSkeleton rows={5} />
  if (!sprint) return <NotFoundPage />

  const issues = planning.plannable.filter((i) => i.sprintId === sprint.id).sort((a, b) => statusRank[a.status] - statusRank[b.status])
  const progress = sprintProgress(sprint)
  const daysLeft = sprint.status === "active" ? sprintDaysLeft(sprint) : null

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1>{sprint.name}</h1>
            <SprintStatusBadge status={sprint.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.name} · <SprintDates sprint={sprint} />
          </p>
        </div>
        <SprintActions sprint={sprint} planning={planning} projectId={project.id} />
      </div>
      {sprint.goal && (
        <p className="rounded-lg border bg-surface px-4 py-3 text-sm">
          <span className="font-medium">Goal:</span> {sprint.goal}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Issues done" value={`${sprint.stats.done}/${sprint.stats.total}`} hint="Stories, tasks and bugs" />
        <StatTile label="Points done" value={`${sprint.stats.donePoints}/${sprint.stats.points}`} hint="From estimated issues" />
        <StatTile label="Progress" value={progress == null ? "–" : `${progress}%`} hint="Done issues ÷ all issues" />
        <StatTile
          label={sprint.status === "completed" ? "Completed" : "Time left"}
          value={
            sprint.status === "completed"
              ? formatDate(sprint.completedAt)
              : daysLeft == null
                ? "Not started"
                : daysLeft >= 0
                  ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"}`
                  : `${-daysLeft} days over`
          }
          hint={sprint.endDate ? `Ends ${formatDate(`${sprint.endDate}T00:00:00`)}` : undefined}
        />
      </dl>

      <section aria-labelledby="sprint-status-breakdown" className="rounded-lg border bg-card p-5 shadow-xs">
        <h2 id="sprint-status-breakdown" className="mb-3">
          By status
        </h2>
        <SprintStats sprint={sprint} />
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {ISSUE_STATUSES.map((status) => (
            <div key={status.value} className="flex items-center gap-2">
              <dt>
                <StatusBadge status={status.value} />
              </dt>
              <dd className="text-sm font-semibold tabular-nums">{sprint.stats.byStatus[status.value] ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="sprint-issues">
        <h2 id="sprint-issues" className="mb-3">
          Issues
        </h2>
        {issues.length === 0 ? (
          <EmptyState
            variant="bordered"
            className="py-8"
            title="No issues in this sprint"
            description={sprint.status === "completed" ? "Unfinished issues were moved out when the sprint was completed." : "Plan issues into this sprint from the backlog."}
          />
        ) : (
          <IssueList label={`${sprint.name} issues`}>
            {issues.map((issue) => (
              <li key={issue.id}>
                <IssueRow issue={issue} assignee={memberMap[issue.assigneeId]} />
              </li>
            ))}
          </IssueList>
        )}
        {sprint.status === "completed" && issues.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">Unfinished issues were moved out when the sprint was completed.</p>
        )}
      </section>
    </div>
  )
}
