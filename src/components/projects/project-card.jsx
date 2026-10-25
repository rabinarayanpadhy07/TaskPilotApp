import { Link } from "react-router"

import { useMemberMap } from "@/api/hooks"
import { PrivateBadge, ProjectStatusBadge, ProjectTile } from "@/components/projects/project-tile"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { paths } from "@/lib/routes"
import { formatRelativeTime } from "@/lib/utils"
import { projectProgress } from "@/models/project"

function ProjectMembers({ memberIds, max = 4 }) {
  const memberMap = useMemberMap()
  const members = memberIds.map((id) => memberMap[id]).filter(Boolean)
  const shown = members.slice(0, max)
  const extra = members.length - shown.length

  return (
    <AvatarGroup aria-label={`${members.length} ${members.length === 1 ? "member" : "members"}`} role="img">
      {shown.map((member) => (
        <UserAvatar key={member.id} name={member.name} size="sm" />
      ))}
      {extra > 0 && <AvatarGroupCount className="size-6 text-[10px]">+{extra}</AvatarGroupCount>}
    </AvatarGroup>
  )
}

/** Done/total summary computed from the project's issues (epics excluded). */
function ProgressSummary({ project }) {
  const progress = projectProgress(project)
  const { done, total } = project.issueCounts
  return (
    <div className="grid grid-cols-1 gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{total === 0 ? "No issues yet" : `${done} of ${total} issues done`}</span>
        {progress != null && <span className="font-medium tabular-nums text-foreground">{progress}%</span>}
      </div>
      <Progress value={progress} label={`${project.name} progress`} />
    </div>
  )
}

/** Grid card: name, key, status, description, progress and members. */
export function ProjectCard({ project }) {
  return (
    <Link
      to={paths.project(project.id)}
      className="focus-ring group flex h-full flex-col gap-4 rounded-lg border bg-card p-5 shadow-xs transition-[border-color,box-shadow] hover:border-input hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <ProjectTile label={project.key} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate group-hover:text-primary">{project.name}</h3>
          <p className="font-mono text-xs text-muted-foreground">{project.key}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>
      <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{project.description || "No description yet."}</p>
      <ProgressSummary project={project} />
      <div className="mt-auto flex items-center justify-between gap-2">
        <ProjectMembers memberIds={project.memberIds} />
        <div className="flex items-center gap-2">
          {project.visibility === "private" && <PrivateBadge />}
          {project.issueCounts.overdue > 0 && (
            <span className="text-xs font-medium text-danger-text">{project.issueCounts.overdue} overdue</span>
          )}
        </div>
      </div>
    </Link>
  )
}

/** Row for the list view. Columns collapse progressively on smaller screens. */
export function ProjectListRow({ project }) {
  const memberMap = useMemberMap()
  const lead = memberMap[project.leadId]
  const progress = projectProgress(project)

  return (
    <Link
      to={paths.project(project.id)}
      className="focus-ring group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-hover sm:px-5 md:grid-cols-[minmax(0,2fr)_9rem_minmax(0,1fr)_7rem] lg:grid-cols-[minmax(0,2fr)_9rem_minmax(0,1fr)_6rem_7rem]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <ProjectTile label={project.key} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium group-hover:text-primary">{project.name}</span>
            {project.visibility === "private" && <PrivateBadge />}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            <span className="font-mono">{project.key}</span> · updated {formatRelativeTime(project.updatedAt)}
          </span>
        </span>
      </span>
      <span className="hidden min-w-0 items-center gap-2 md:flex">
        {lead ? (
          <>
            <UserAvatar name={lead.name} size="sm" />
            <span className="truncate text-sm">{lead.name}</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">No lead</span>
        )}
      </span>
      <span className="hidden items-center gap-3 md:flex">
        <Progress value={progress} label={`${project.name} progress`} className="flex-1" />
        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{progress == null ? "–" : `${progress}%`}</span>
      </span>
      <span className="hidden lg:block">
        <ProjectMembers memberIds={project.memberIds} max={3} />
      </span>
      <span className="justify-self-end">
        <ProjectStatusBadge status={project.status} />
      </span>
    </Link>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-7" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  )
}

export function ProjectGrid({ projects, isPending, limit }) {
  const list = limit ? projects?.slice(0, limit) : projects
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={isPending || undefined}>
      {isPending
        ? Array.from({ length: limit ?? 6 }, (_, index) => (
            <li key={index}>
              <ProjectCardSkeleton />
            </li>
          ))
        : list?.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
    </ul>
  )
}

export function ProjectListView({ projects, isPending }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-xs" aria-busy={isPending || undefined}>
      <div className="hidden grid-cols-[minmax(0,2fr)_9rem_minmax(0,1fr)_7rem] gap-4 border-b bg-background/60 px-5 py-2 text-xs font-medium text-muted-foreground md:grid lg:grid-cols-[minmax(0,2fr)_9rem_minmax(0,1fr)_6rem_7rem]" aria-hidden="true">
        <span>Project</span>
        <span>Lead</span>
        <span>Progress</span>
        <span className="hidden lg:block">Members</span>
        <span className="text-right">Status</span>
      </div>
      <ul className="divide-y" aria-label="Projects">
        {isPending
          ? Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="size-7" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="ml-auto h-5 w-20 rounded-full" />
              </li>
            ))
          : projects.map((project) => (
              <li key={project.id}>
                <ProjectListRow project={project} />
              </li>
            ))}
      </ul>
    </div>
  )
}
