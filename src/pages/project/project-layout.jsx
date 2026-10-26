import { Calendar, Plus } from "lucide-react"
import { NavLink, Outlet } from "react-router"

import { useMemberMap } from "@/api/hooks"
import { CreateIssueDialog } from "@/components/issues/issue-form"
import { EditProjectDialog } from "@/components/projects/edit-project-dialog"
import { PrivateBadge, ProjectPhaseBadge, ProjectStatusBadge, ProjectTile } from "@/components/projects/project-tile"
import { Button } from "@/components/ui/button"
import { QueryError } from "@/components/ui/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { formatDate } from "@/lib/dates"
import { paths } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { projectCan } from "@/models/project"
import { PERMS } from "@/models/roles"
import { NotFoundPage } from "@/pages/not-found-page"
import { useRouteProject } from "@/pages/project/use-route-project"

/** Loads the project once for every project route; shows 404 for unknown ids. */
export function ProjectRoute() {
  const { data: project, isPending, error, refetch, isFetching } = useRouteProject()

  if (isPending) {
    return (
      <div className="flex items-center gap-4" aria-busy="true" aria-label="Loading project">
        <Skeleton className="size-10 rounded-lg" />
        <div className="grid gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
      </div>
    )
  }
  if (error) return <QueryError error={error} title="Couldn't load this project" onRetry={refetch} retrying={isFetching} />
  if (!project) return <NotFoundPage />
  return <Outlet />
}

function ProjectTabs({ project }) {
  const tabs = [
    { to: paths.project(project.id), label: "Overview", end: true },
    { to: `${paths.project(project.id)}/board`, label: "Board" },
    { to: `${paths.project(project.id)}/backlog`, label: "Backlog" },
    { to: paths.projectIssues(project.id), label: "Issues", count: project.issueCounts.total + (project.issueCounts.byType.epic ?? 0), end: true },
    { to: `${paths.project(project.id)}/epics`, label: "Epics", count: project.issueCounts.byType.epic ?? 0 },
    { to: `${paths.project(project.id)}/sprints`, label: "Sprints", end: true },
    { to: `${paths.project(project.id)}/members`, label: "Members", count: project.memberIds.length },
  ]

  return (
    <nav aria-label={`${project.name} sections`} className="relative -mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {tabs.map((tab) => (
          <li key={tab.label}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  "focus-ring -mb-px flex h-10 items-center gap-1.5 rounded-t-md border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                )
              }
            >
              {tab.label}
              {tab.count != null && <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">{tab.count}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Project header + section navigation around the project tabs. */
export function ProjectLayout() {
  const { data: project } = useRouteProject()
  const memberMap = useMemberMap()
  const lead = memberMap[project.leadId]
  const canEdit = projectCan(project, PERMS.projectUpdate)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <ProjectTile label={project.key} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold">{project.name}</h1>
              <ProjectPhaseBadge phase={project.phase} />
              <ProjectStatusBadge status={project.status} />
              {project.visibility === "private" && <PrivateBadge />}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono font-medium">{project.key}</span>
              {lead && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <UserAvatar name={lead.name} size="sm" className="size-5" />
                    Led by {lead.name}
                  </span>
                </>
              )}
              {project.targetDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" aria-hidden="true" />
                    Target: {formatDate(project.targetDate)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canEdit && <EditProjectDialog project={project} />}
          <CreateIssueDialog defaults={{ projectId: project.id }}>
            <Button>
              <Plus />
              Create issue
            </Button>
          </CreateIssueDialog>
        </div>
      </div>
      <ProjectTabs project={project} />
      <Outlet />
    </div>
  )
}
