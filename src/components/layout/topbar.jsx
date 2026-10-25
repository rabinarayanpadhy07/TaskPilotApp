import { Menu, Plus } from "lucide-react"
import { useMatches } from "react-router"

import { IconButton } from "@/components/icon-button"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { GlobalSearch } from "@/components/layout/global-search"
import { NotificationsMenu } from "@/components/layout/notifications-menu"
import { UserMenu } from "@/components/layout/user-menu"
import { CreateIssueDialog } from "@/components/issues/issue-form"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/stores/ui-store"

/** Sticky header: breadcrumbs on the left; search, notifications, create and account on the right. */
export function Topbar() {
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen)
  // Prefill the project when creating from inside a project
  const projectId = useMatches().at(-1)?.params.projectId

  return (
    <header className="sticky top-0 z-20 flex h-(--topbar-height) shrink-0 items-center gap-2 border-b bg-surface px-4 sm:gap-4 sm:px-6 lg:px-8">
      <IconButton
        label="Open navigation"
        icon={Menu}
        className="-ml-2 text-foreground lg:hidden"
        onClick={() => setMobileNavOpen(true)}
      />

      <Breadcrumbs className="flex-1" />

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <GlobalSearch />
        <NotificationsMenu />
        <CreateIssueDialog defaults={projectId ? { projectId } : undefined}>
          <Button size="sm" className="has-[>svg]:px-2 sm:has-[>svg]:px-2.5" aria-label="Create issue">
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">Create</span>
          </Button>
        </CreateIssueDialog>
        <div className="ml-1 h-5 w-px bg-border" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  )
}
