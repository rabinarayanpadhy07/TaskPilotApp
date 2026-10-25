import { ArrowRight } from "lucide-react"
import { Link } from "react-router"

import { useIssues, useMemberMap } from "@/api/hooks"
import { IssueTypeIcon, StatusBadge } from "@/components/issues/issue-badges"
import { IssueList, IssueListSkeleton, IssueRow } from "@/components/issues/issue-row"
import { Progress } from "@/components/ui/progress"
import { QueryError } from "@/components/ui/query-error"
import { UserAvatar } from "@/components/user-avatar"
import { formatDate } from "@/lib/dates"
import { paths } from "@/lib/routes"
import { compareIssuesByUrgency, isDone, ISSUE_STATUSES, ISSUE_TYPES } from "@/models/issue"
import { PROJECT_VISIBILITY, projectProgress } from "@/models/project"
import { useRouteProject } from "@/pages/project/use-route-project"

function Panel({ title, children, action }) {
  const id = `project-${title.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <section aria-labelledby={id} className="rounded-lg border bg-card p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id={id}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Issue counts and progress come from the API's per-project aggregates. */
export function ProjectOverviewTab() {
  const { data: project } = useRouteProject()
  const { data: issues = [], isPending, error, refetch } = useIssues({ projectId: project.id })
  const memberMap = useMemberMap()
  const counts = project.issueCounts
  const progress = projectProgress(project)
  const lead = memberMap[project.leadId]
  const upcoming = issues.filter((i) => !isDone(i) && i.type !== "epic").sort(compareIssuesByUrgency).slice(0, 5)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="grid grid-cols-1 content-start gap-6 lg:col-span-2">
        <Panel title="About">
          <p className="text-sm leading-6 whitespace-pre-wrap text-foreground">
            {project.description || <span className="text-muted-foreground">No description yet.</span>}
          </p>
        </Panel>

        <Panel title="Issues by status">
          <div className="mb-5 grid grid-cols-1 gap-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">
                {counts.total === 0 ? "No issues yet" : `${counts.done} of ${counts.total} issues done`}
                {counts.overdue > 0 && <span className="text-danger-text"> · {counts.overdue} overdue</span>}
              </span>
              <span className="font-semibold tabular-nums">{progress == null ? "–" : `${progress}%`}</span>
            </div>
            <Progress value={progress} label={`${project.name} progress`} />
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {ISSUE_STATUSES.map((status) => (
              <div key={status.value} className="grid grid-cols-1 gap-1.5 rounded-md border bg-background/50 p-3">
                <dt>
                  <StatusBadge status={status.value} />
                </dt>
                <dd className="text-xl font-semibold tabular-nums">{counts.byStatus[status.value] ?? 0}</dd>
              </div>
            ))}
          </dl>
          <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-sm">
            {ISSUE_TYPES.map((type) => (
              <div key={type.value} className="flex items-center gap-2">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <IssueTypeIcon type={type.value} />
                  {type.plural}
                </dt>
                <dd className="font-medium tabular-nums">{counts.byType[type.value] ?? 0}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Status counts and progress exclude epics.</p>
        </Panel>

        <section aria-labelledby="project-next-up">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="project-next-up">Next up</h2>
            <Link to={paths.projectIssues(project.id)} className="focus-ring inline-flex items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground hover:text-primary">
              All issues
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
          {error ? (
            <QueryError error={error} title="Couldn't load issues" onRetry={refetch} />
          ) : isPending ? (
            <IssueListSkeleton rows={3} />
          ) : upcoming.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-surface px-5 py-6 text-center text-sm text-muted-foreground">No open issues. Nice work.</p>
          ) : (
            <IssueList label="Next up">
              {upcoming.map((issue) => (
                <li key={issue.id}>
                  <IssueRow issue={issue} assignee={memberMap[issue.assigneeId]} density="compact" />
                </li>
              ))}
            </IssueList>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 content-start gap-6">
        <Panel title="Details">
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Lead</dt>
              <dd className="flex items-center gap-2">
                {lead ? (
                  <>
                    <UserAvatar name={lead.name} size="sm" />
                    {lead.name}
                  </>
                ) : (
                  "No lead"
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Visibility</dt>
              <dd>{PROJECT_VISIBILITY.find((v) => v.value === project.visibility)?.label}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(project.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Last updated</dt>
              <dd>{formatDate(project.updatedAt)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel
          title="Members"
          action={
            <Link to={`${paths.project(project.id)}/members`} className="focus-ring rounded-sm text-sm font-medium text-muted-foreground hover:text-primary">
              View all
            </Link>
          }
        >
          <ul className="grid grid-cols-1 gap-3">
            {project.memberIds.slice(0, 5).map((id) => {
              const member = memberMap[id]
              if (!member) return null
              return (
                <li key={id} className="flex items-center gap-3">
                  <UserAvatar name={member.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{member.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{member.title}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
