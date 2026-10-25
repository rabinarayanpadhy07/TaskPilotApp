import { useRef } from "react"
import { ExternalLink } from "lucide-react"
import { Link } from "react-router"

import { useIssue } from "@/api/hooks"
import { IssueDetail, IssueDetailSkeleton } from "@/components/issues/issue-detail"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { parseApiError } from "@/lib/api-errors"
import { paths } from "@/lib/routes"

/** Side panel with the full issue view, used by the board and backlog. */
export function IssuePanel({ issueKey, onClose }) {
  const { data: issue, isPending, isError, error } = useIssue(issueKey ?? undefined)
  const headerRef = useRef(null)

  return (
    <Sheet open={Boolean(issueKey)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl"
        // Focus the header, not the first button: avoids an auto-opened tooltip
        // swallowing the first Escape press
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          headerRef.current?.focus()
        }}
      >
        <div ref={headerRef} tabIndex={-1} className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-surface px-5 pr-14 outline-none">
          <SheetTitle className="text-sm font-medium text-muted-foreground">{issueKey}</SheetTitle>
          <SheetDescription className="sr-only">Issue details</SheetDescription>
          {issue && (
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" asChild>
              <Link to={paths.issue(issue)}>
                <ExternalLink />
                Open full page
              </Link>
            </Button>
          )}
        </div>
        <div className="p-5">
          {isPending && <IssueDetailSkeleton />}
          {isError && !issue && (
            <Alert variant="danger">
              {error?.response?.status === 404 ? `Issue ${issueKey} was not found.` : parseApiError(error).message}
            </Alert>
          )}
          {issue && <IssueDetail issue={issue} layout="panel" />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
