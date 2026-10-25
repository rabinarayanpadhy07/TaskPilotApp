import { ArrowRightLeft, ChevronDown, CircleDot, Signal, UserRound, X } from "lucide-react"
import { toast } from "sonner"

import { useBulkUpdateIssues } from "@/api/hooks"
import { PriorityBadge, StatusBadge } from "@/components/issues/issue-badges"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/user-avatar"
import { parseApiError } from "@/lib/api-errors"
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "@/models/issue"

function BulkMenu({ label, icon: Icon, children, disabled }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="ghost" size="sm" className="text-foreground data-[state=open]:bg-hover">
          <Icon />
          <span className="hidden sm:inline">{label}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="max-h-72 w-56 overflow-y-auto">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Floating bar for the backlog selection. One request per action
 * (all-or-nothing on the server); the selection clears on success.
 */
export function BulkActionBar({ selectedKeys, onClear, sprints, members }) {
  const bulk = useBulkUpdateIssues()

  function apply(changes, description) {
    bulk.mutate(
      { keys: selectedKeys, changes },
      {
        onSuccess: () => {
          toast.success(`${selectedKeys.length} ${selectedKeys.length === 1 ? "issue" : "issues"} updated`, {
            description: `${description}.`,
          })
          onClear()
        },
        onError: (error) => toast.error("Couldn't update the selected issues", { description: `${parseApiError(error).message} Nothing was changed.` }),
      }
    )
  }

  if (selectedKeys.length === 0) return null

  return (
    <div role="region" aria-label="Bulk actions" className="sticky bottom-4 z-10 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border bg-surface p-1.5 pl-3 shadow-lg">
      <span className="mr-1 text-sm font-medium" role="status">
        {selectedKeys.length} selected
      </span>
      <BulkMenu label="Move to" icon={ArrowRightLeft} disabled={bulk.isPending}>
        {sprints.map((sprint) => (
          <DropdownMenuItem key={sprint.id} onSelect={() => apply({ sprintId: sprint.id }, `Moved to ${sprint.name}`)}>
            {sprint.name}
            {sprint.status === "active" && <span className="ml-auto text-xs text-muted-foreground">active</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => apply({ sprintId: null }, "Moved to the backlog")}>Backlog</DropdownMenuItem>
      </BulkMenu>
      <BulkMenu label="Status" icon={CircleDot} disabled={bulk.isPending}>
        {ISSUE_STATUSES.map((status) => (
          <DropdownMenuItem key={status.value} onSelect={() => apply({ status: status.value }, `Status set to ${status.label}`)}>
            <StatusBadge status={status.value} />
          </DropdownMenuItem>
        ))}
      </BulkMenu>
      <BulkMenu label="Priority" icon={Signal} disabled={bulk.isPending}>
        {ISSUE_PRIORITIES.map((priority) => (
          <DropdownMenuItem key={priority.value} onSelect={() => apply({ priority: priority.value }, `Priority set to ${priority.label}`)}>
            <PriorityBadge priority={priority.value} />
          </DropdownMenuItem>
        ))}
      </BulkMenu>
      <BulkMenu label="Assignee" icon={UserRound} disabled={bulk.isPending}>
        <DropdownMenuItem onSelect={() => apply({ assigneeId: null }, "Unassigned")}>
          <span className="text-muted-foreground">Unassigned</span>
        </DropdownMenuItem>
        {members.map((member) => (
          <DropdownMenuItem key={member.id} onSelect={() => apply({ assigneeId: member.id }, `Assigned to ${member.name}`)}>
            <UserAvatar name={member.name} size="sm" />
            {member.name}
          </DropdownMenuItem>
        ))}
      </BulkMenu>
      <Button variant="ghost" size="icon-sm" aria-label="Clear selection" className="text-muted-foreground" onClick={onClear}>
        <X />
      </Button>
    </div>
  )
}
