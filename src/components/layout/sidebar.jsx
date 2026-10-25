import { MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react"
import { Link, NavLink } from "react-router"

import {
  useActiveWorkspace,
  useCurrentUser,
  useProjects,
  useMyIssues,
  useTeams,
  useUnreadCount,
} from "@/api/hooks"
import { IconButton } from "@/components/icon-button"
import { Brand } from "@/components/layout/brand"
import { footerNavigation, mainNavigation, teamNavigation } from "@/components/layout/navigation"
import { SidebarLink, SidebarSection, SidebarSkeletonRows } from "@/components/layout/sidebar-nav"
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ProjectTile } from "@/components/projects/project-tile"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"

const MAX_SIDEBAR_PROJECTS = 5

const countLabels = { tasks: "open", unread: "unread" }

function useNavCounts() {
  const unread = useUnreadCount()
  const { data: myIssues = [] } = useMyIssues()
  return { unread, tasks: myIssues.filter((issue) => issue.type !== "epic" && issue.status !== "done").length }
}

function ProjectsSection({ collapsed, onNavigate }) {
  const { data: projects, isPending } = useProjects()
  const visible = projects?.slice(0, MAX_SIDEBAR_PROJECTS) ?? []
  const hiddenCount = (projects?.length ?? 0) - visible.length

  return (
    <SidebarSection
      title="Projects"
      collapsed={collapsed}
      action={
        <CreateProjectDialog>
          <IconButton label="Create project" icon={Plus} size="icon-xs" tooltipSide="right" />
        </CreateProjectDialog>
      }
    >
      {isPending && <SidebarSkeletonRows collapsed={collapsed} />}
      {visible.map((project) => (
        <li key={project.id}>
          <SidebarLink
            to={`/projects/${project.id}`}
            label={project.name}
            leading={<ProjectTile label={project.key} size="sm" />}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </li>
      ))}
      {!isPending && projects?.length === 0 && !collapsed && (
        <li className="px-2 py-1.5 text-xs text-muted-foreground">No projects yet</li>
      )}
      {hiddenCount > 0 && (
        <li>
          <SidebarLink
            to="/projects"
            end
            label={`View all (${projects.length})`}
            icon={MoreHorizontal}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </li>
      )}
    </SidebarSection>
  )
}

function TeamSection({ collapsed, onNavigate }) {
  const { data: teams, isPending } = useTeams()

  return (
    <SidebarSection title="Team" collapsed={collapsed}>
      <li>
        <SidebarLink {...teamNavigation} collapsed={collapsed} onNavigate={onNavigate} />
      </li>
      {isPending && <SidebarSkeletonRows rows={2} collapsed={collapsed} />}
      {teams?.map((team) => (
        <li key={team.id}>
          <SidebarLink
            to={`/team/${team.id}`}
            label={team.name}
            leading={<ProjectTile label={team.name} size="sm" className="rounded-full" />}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </li>
      ))}
    </SidebarSection>
  )
}

function UserProfileLink({ collapsed, onNavigate }) {
  const { data: user } = useCurrentUser()
  if (!user) return <div className="h-11" />

  const link = (
    <NavLink
      to="/profile"
      onClick={onNavigate}
      aria-label={collapsed ? `Your profile, ${user.name}` : undefined}
      className={({ isActive }) =>
        cn(
          "focus-ring flex min-w-0 items-center gap-2.5 rounded-md transition-colors",
          isActive ? "bg-selected" : "hover:bg-hover",
          collapsed ? "size-10 justify-center" : "h-11 flex-1 px-2"
        )
      }
    >
      <UserAvatar name={user.name} size="sm" />
      {!collapsed && (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </span>
      )}
    </NavLink>
  )

  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">Your profile</TooltipContent>
    </Tooltip>
  )
}

/**
 * Everything inside the sidebar. Shared by the desktop sidebar and the mobile
 * drawer; `onNavigate` lets the drawer close itself after a link is followed.
 */
export function SidebarContent({ collapsed = false, onNavigate, onToggleCollapsed }) {
  const counts = useNavCounts()
  const { workspace } = useActiveWorkspace()

  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar"

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "flex h-(--topbar-height) shrink-0 items-center border-b",
          collapsed ? "justify-center px-2" : "px-5"
        )}
      >
        <Link to="/" onClick={onNavigate} className="focus-ring rounded-md" aria-label="TaskPilot, go to Overview">
          <Brand collapsed={collapsed} />
        </Link>
      </div>

      <div className="shrink-0 px-3 pt-3">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      <nav
        aria-label={workspace ? `${workspace.name} navigation` : "Workspace navigation"}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 pt-3 pb-4"
      >
        <ul className="flex flex-col gap-0.5">
          {mainNavigation.map((item) => (
            <li key={item.to}>
              <SidebarLink
                {...item}
                count={item.count ? counts[item.count] : 0}
                countLabel={item.count ? countLabels[item.count] : undefined}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
        <ProjectsSection collapsed={collapsed} onNavigate={onNavigate} />
        <TeamSection collapsed={collapsed} onNavigate={onNavigate} />
      </nav>

      <div className="shrink-0 border-t px-3 py-3">
        <ul className="flex flex-col gap-0.5">
          {footerNavigation.map((item) => (
            <li key={item.to}>
              <SidebarLink {...item} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        <div className={cn("mt-2 flex items-center gap-1", collapsed && "flex-col")}>
          <UserProfileLink collapsed={collapsed} onNavigate={onNavigate} />
          {onToggleCollapsed && (
            <IconButton
              label={toggleLabel}
              icon={collapsed ? PanelLeftOpen : PanelLeftClose}
              size="icon-sm"
              tooltipSide="right"
              aria-expanded={!collapsed}
              onClick={onToggleCollapsed}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/** Fixed desktop sidebar (lg and up), 250px wide; collapses to an icon rail. */
export function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden border-r bg-surface lg:block",
        collapsed ? "w-(--sidebar-width-collapsed)" : "w-(--sidebar-width)"
      )}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapsed={toggleSidebar} />
    </aside>
  )
}
