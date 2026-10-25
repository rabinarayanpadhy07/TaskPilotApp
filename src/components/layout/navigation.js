import {
  BarChart3,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Palette,
  Settings,
  UserRound,
  Users,
} from "lucide-react"

/**
 * Primary navigation. `end` makes a link active only on an exact match, so
 * "Projects" is not highlighted while a specific project is open.
 * `count` names a live counter the sidebar resolves (see sidebar.jsx).
 */
export const mainNavigation = [
  { label: "Overview", to: "/", icon: LayoutDashboard, end: true },
  { label: "My Tasks", to: "/my-tasks", icon: ListTodo, count: "tasks" },
  { label: "Projects", to: "/projects", icon: FolderKanban, end: true },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Inbox", to: "/inbox", icon: Inbox, count: "unread" },
]

export const teamNavigation = { label: "All members", to: "/team", icon: Users, end: true }

export const footerNavigation = [
  { label: "Settings", to: "/settings", icon: Settings },
  // Component reference, visible in development builds only
  ...(import.meta.env.DEV
    ? [{ label: "Design system", to: "/design-system", icon: Palette }]
    : []),
]

/** Pages offered by global search, in addition to projects and teams. */
export const searchablePages = [
  ...mainNavigation,
  teamNavigation,
  { label: "Profile", to: "/profile", icon: UserRound },
  { label: "Members & roles", to: "/settings/members", icon: Users },
  ...footerNavigation,
]
