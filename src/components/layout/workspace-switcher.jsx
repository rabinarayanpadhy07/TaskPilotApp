import { ChevronsUpDown, Plus, Settings, Ticket } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { useActiveWorkspace } from "@/api/hooks"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { workspaceRoleLabel } from "@/models/roles"
import { useUIStore } from "@/stores/ui-store"

function WorkspaceTile({ name, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-selected text-xs font-semibold text-primary",
        className
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

/**
 * Shows the active workspace and lets the user switch to another one.
 * Switching returns to Overview, since pages are scoped to a workspace.
 */
export function WorkspaceSwitcher({ collapsed = false }) {
  const navigate = useNavigate()
  const setActiveWorkspaceId = useUIStore((state) => state.setActiveWorkspaceId)
  const { workspace, workspaces, isPending } = useActiveWorkspace()

  if (isPending || !workspace) {
    return (
      <div className={cn("flex h-11 items-center gap-2.5 px-2", collapsed && "justify-center px-0")}>
        <Skeleton className="size-7" />
        {!collapsed && <Skeleton className="h-3 w-24" />}
      </div>
    )
  }

  function switchWorkspace(id) {
    if (id === workspace.id) return
    setActiveWorkspaceId(id)
    navigate("/")
  }

  const trigger = (
    <DropdownMenuTrigger
      aria-label={`Current workspace: ${workspace.name}. Switch workspace`}
      className={cn(
        "focus-ring flex cursor-pointer items-center gap-2.5 rounded-md text-left transition-colors hover:bg-hover data-[state=open]:bg-hover",
        collapsed ? "mx-auto size-10 justify-center" : "h-11 w-full px-2"
      )}
    >
      <WorkspaceTile name={workspace.name} />
      {!collapsed && (
        <>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">{workspace.name}</span>
            <span className="truncate text-xs text-muted-foreground">{workspaceRoleLabel(workspace.role)}</span>
          </span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </>
      )}
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right">{workspace.name}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent
        align="start"
        side={collapsed ? "right" : "bottom"}
        className={cn("w-60", !collapsed && "w-(--radix-dropdown-menu-trigger-width) min-w-60")}
      >
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={workspace.id} onValueChange={switchWorkspace}>
          {workspaces.map((ws) => (
            <DropdownMenuRadioItem key={ws.id} value={ws.id} indicator="end" className="gap-2.5">
              <WorkspaceTile name={ws.name} className="size-6 text-[11px]" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{ws.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {workspaceRoleLabel(ws.role)} · {ws.memberIds.length} {ws.memberIds.length === 1 ? "member" : "members"}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings />
            Workspace settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/onboarding/workspace">
            <Plus />
            Create workspace
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/join">
            <Ticket />
            Join with invitation
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
