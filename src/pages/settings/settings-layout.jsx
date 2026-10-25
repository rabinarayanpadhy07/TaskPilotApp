import { NavLink, Outlet } from "react-router"

import { useActiveWorkspace } from "@/api/hooks"
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"

const tabs = [
  { to: "/settings", label: "General", end: true },
  { to: "/settings/members", label: "Members" },
  { to: "/settings/roles", label: "Roles & permissions" },
]

export function SettingsLayout() {
  const { workspace } = useActiveWorkspace()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description={workspace ? `Manage ${workspace.name} and who can access it.` : undefined} />
      <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-1">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "focus-ring -mb-px flex h-10 items-center rounded-t-md border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                    isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
