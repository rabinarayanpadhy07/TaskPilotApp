import { useMemo } from "react"
import { AlarmClock, ArrowRight, CircleCheckBig, FolderKanban, ListTodo, Plus } from "lucide-react"
import { Link } from "react-router"

import {
  useActiveWorkspace,
  useCurrentUser,
  useIssues,
  useMemberMap,
  useMyIssues,
  useProjects,
  useWorkspaceActivity,
} from "@/api/hooks"
import { describeActivity } from "@/components/issues/describe-activity"
import { IssueTypeIcon } from "@/components/issues/issue-badges"
import { CreateIssueDialog } from "@/components/issues/issue-form"
import { DueDate, IssueList, IssueListSkeleton, IssueRow } from "@/components/issues/issue-row"
import { PageHeader } from "@/components/page-header"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ProjectPhaseBadge, ProjectTile } from "@/components/projects/project-tile"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Progress } from "@/components/ui/progress"
import { QueryError } from "@/components/ui/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { addDaysISO, isWithinLastDays } from "@/lib/dates"
import { paths } from "@/lib/routes"
import { cn, formatRelativeTime } from "@/lib/utils"
import { compareIssuesByUrgency, isDone, isOverdue } from "@/models/issue"
import { projectProgress } from "@/models/project"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function StatCard({ label, value, hint, icon: Icon, to, tone = "default", isPending }) {
  return (
    <Link
      to={to}
      className="focus-ring group flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs transition-[border-color,box-shadow] hover:border-input hover:shadow-sm sm:p-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-md",
            tone === "danger" ? "bg-danger/8 text-danger-text" : tone === "success" ? "bg-success/8 text-success-text" : "bg-selected text-primary"
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      {isPending ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <span className={cn("text-2xl font-semibold tabular-nums", tone === "danger" && value > 0 && "text-danger-text")}>{value}</span>
      )}
      <span className="text-xs text-muted-foreground">{hint}</span>
    </Link>
  )
}

function Section({ id, title, action, children, className }) {
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={id}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function SectionLink({ to, children }) {
  return (
    <Link to={to} className="focus-ring inline-flex items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground hover:text-primary">
      {children}
      <ArrowRight aria-hidden="true" className="size-3.5" />
    </Link>
  )
}

function ProjectProgressList({ projects }) {
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-xs" aria-label="Project progress">
      {projects.map((project) => {
        const progress = projectProgress(project)
        const { done, total, overdue } = project.issueCounts
        return (
          <li key={project.id}>
            <Link to={paths.project(project.id)} className="focus-ring group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-hover sm:px-5">
              <ProjectTile label={project.key} />
              <div className="grid grid-cols-1 min-w-0 flex-1 gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 truncate">
                    <span className="truncate text-sm font-medium group-hover:text-primary">{project.name}</span>
                    <ProjectPhaseBadge phase={project.phase} className="hidden sm:inline-flex text-[10px] h-4 py-0" />
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {total === 0 ? "No issues" : `${done}/${total} done`}
                    {overdue > 0 && <span className="text-danger-text"> · {overdue} overdue</span>}
                  </span>
                </div>
                <Progress value={progress} label={`${project.name} progress`} />
              </div>
              <span className="hidden w-10 text-right text-sm font-medium tabular-nums sm:block">{progress == null ? "–" : `${progress}%`}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function UpcomingDeadlines({ issues, projectsById }) {
  if (issues.length === 0) {
    return <EmptyState variant="bordered" className="py-8" title="Nothing due in the next two weeks" description="Issues with due dates will show up here." />
  }
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-xs" aria-label="Upcoming deadlines">
      {issues.map((issue) => (
        <li key={issue.id}>
          <Link to={paths.issue(issue)} className="focus-ring group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-hover">
            <IssueTypeIcon type={issue.type} label className="mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium group-hover:text-primary">{issue.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                <span className="font-mono">{issue.key}</span> · {projectsById[issue.projectId]?.name}
              </span>
            </span>
            <DueDate value={issue.dueDate} className="mt-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ActivityFeed({ events, memberMap }) {
  if (events.length === 0) {
    return <EmptyState variant="bordered" className="py-8" title="No activity yet" description="Updates to issues in this workspace will appear here." />
  }
  return (
    <ol className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 shadow-xs" aria-label="Recent activity">
      {events.map((event) => {
        const actor = memberMap[event.actorId]
        const issue = event.issueKey && event.projectId ? { key: event.issueKey, title: event.issueTitle, projectId: event.projectId } : null
        return (
          <li key={event.id} className="flex gap-3">
            <UserAvatar name={actor?.name ?? "Someone"} size="sm" className="mt-0.5" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{actor?.name ?? "Someone"}</span>{" "}
                {describeActivity(event, { memberMap, issuesById: {} })}
              </p>
              {issue && (
                <Link to={paths.issue(issue)} className="focus-ring mt-0.5 flex items-center gap-1.5 rounded-sm text-[13px] hover:text-primary">
                  <span className="shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{issue.key}</span>
                  <span className="truncate">{issue.title}</span>
                </Link>
              )}
              <time dateTime={event.createdAt} className="text-xs text-muted-foreground">
                {formatRelativeTime(event.createdAt)}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Workspace dashboard. Every number is derived from the issues and projects
 * returned by the data source; nothing is estimated or extrapolated.
 */
export function OverviewPage() {
  const { data: user } = useCurrentUser()
  const { workspace } = useActiveWorkspace()
  const { data: myIssues = [], isPending: myPending, error: myError, refetch: refetchMine } = useMyIssues()
  const { data: projects = [], isPending: projectsPending, error: projectsError, refetch: refetchProjects } = useProjects()
  // Only open issues due in the next two weeks (or overdue) are fetched for this card
  const { data: dueSoon = [], isPending: duePending, error: dueError, refetch: refetchDue } = useIssues({ dueBefore: addDaysISO(14), open: true })
  const { data: activity = [], isPending: activityPending, error: activityError, refetch: refetchActivity } = useWorkspaceActivity({ limit: 8 })
  const memberMap = useMemberMap()

  const stats = useMemo(() => {
    const work = myIssues.filter((issue) => issue.type !== "epic")
    const open = work.filter((issue) => !isDone(issue))
    return {
      open: open.sort(compareIssuesByUrgency),
      overdue: open.filter((issue) => isOverdue(issue)).length,
      completedThisWeek: work.filter((issue) => isDone(issue) && isWithinLastDays(issue.completedAt, 7)).length,
    }
  }, [myIssues])

  const activeProjects = projects.filter((project) => project.status !== "completed")
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]))
  const upcoming = dueSoon
    .filter((issue) => issue.type !== "epic")
    .sort(compareIssuesByUrgency)
    .slice(0, 6)

  const firstName = user?.name?.split(" ")[0]
  const noProjects = !projectsPending && !projectsError && projects.length === 0
  const firstError = myError ?? projectsError
  const retryAll = () => Promise.all([refetchMine(), refetchProjects()])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={firstName ? `${greeting()}, ${firstName}` : "Overview"}
        description={workspace ? `Here's what's happening in ${workspace.name}.` : undefined}
        actions={
          <>
            <CreateProjectDialog>
              <Button variant="secondary">
                <FolderKanban />
                New project
              </Button>
            </CreateProjectDialog>
            <CreateIssueDialog>
              <Button disabled={noProjects}>
                <Plus />
                Create issue
              </Button>
            </CreateIssueDialog>
          </>
        }
      />

      {firstError && <QueryError error={firstError} title="Some of your overview couldn't be loaded" onRetry={retryAll} />}

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Assigned to you" value={stats.open.length} hint="Open issues" icon={ListTodo} to="/my-tasks" isPending={myPending} />
        <StatCard label="Overdue" value={stats.overdue} hint="Past their due date" icon={AlarmClock} tone="danger" to="/my-tasks?due=overdue" isPending={myPending} />
        <StatCard label="Completed" value={stats.completedThisWeek} hint="Done in the last 7 days" icon={CircleCheckBig} tone="success" to="/my-tasks?show=done" isPending={myPending} />
        <StatCard label="Active projects" value={activeProjects.length} hint={`${projects.length} in this workspace`} icon={FolderKanban} to="/projects" isPending={projectsPending} />
      </section>

      {noProjects ? (
        <EmptyState
          variant="bordered"
          icon={FolderKanban}
          title="Create your first project"
          description="Projects hold your issues, boards and people. Once you add one, progress and deadlines show up here."
          action={
            <CreateProjectDialog>
              <Button>
                <Plus />
                Create project
              </Button>
            </CreateProjectDialog>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="grid grid-cols-1 content-start gap-8 lg:col-span-2">
            <Section id="overview-my-tasks" title="My tasks" action={<SectionLink to="/my-tasks">View all</SectionLink>}>
              {myPending ? (
                <IssueListSkeleton rows={4} />
              ) : stats.open.length === 0 ? (
                <EmptyState variant="bordered" className="py-8" icon={ListTodo} title="Nothing assigned to you" description="Issues assigned to you will appear here." />
              ) : (
                <IssueList label="My open issues">
                  {stats.open.slice(0, 6).map((issue) => (
                    <li key={issue.id}>
                      <IssueRow issue={issue} assignee={memberMap[issue.assigneeId]} projectName={projectsById[issue.projectId]?.name} density="compact" />
                    </li>
                  ))}
                </IssueList>
              )}
            </Section>

            <Section id="overview-progress" title="Project progress" action={<SectionLink to="/projects">All projects</SectionLink>}>
              {projectsPending ? <Skeleton className="h-48 w-full rounded-lg" /> : <ProjectProgressList projects={activeProjects} />}
              <p className="mt-2 text-xs text-muted-foreground">Progress = done issues ÷ all issues in the project, excluding epics.</p>
            </Section>
          </div>

          <div className="grid grid-cols-1 content-start gap-8">
            <Section id="overview-deadlines" title="Upcoming deadlines">
              {dueError ? (
                <QueryError error={dueError} title="Couldn't load deadlines" onRetry={refetchDue} />
              ) : duePending ? (
                <Skeleton className="h-40 w-full rounded-lg" />
              ) : (
                <UpcomingDeadlines issues={upcoming} projectsById={projectsById} />
              )}
            </Section>
            <Section id="overview-activity" title="Recent activity">
              {activityError ? (
                <QueryError error={activityError} title="Couldn't load activity" onRetry={refetchActivity} />
              ) : activityPending ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (
                <ActivityFeed events={activity} memberMap={memberMap} />
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  )
}
