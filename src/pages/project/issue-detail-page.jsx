import { FileQuestion, RotateCw } from "lucide-react"
import { Link, Navigate, useParams } from "react-router"

import { useIssue } from "@/api/hooks"
import { IssueDetail, IssueDetailSkeleton } from "@/components/issues/issue-detail"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { parseApiError } from "@/lib/api-errors"
import { paths } from "@/lib/routes"

export function IssueDetailPage() {
  const { projectId, issueKey } = useParams()
  const { data: issue, isPending, isError, error, refetch, isFetching } = useIssue(issueKey)

  if (isPending) return <IssueDetailSkeleton />

  if (isError && !issue) {
    const notFound = error?.response?.status === 404
    return (
      <EmptyState
        variant="bordered"
        icon={FileQuestion}
        title={notFound ? `Issue ${issueKey} not found` : "Couldn't load this issue"}
        description={notFound ? "It may have been deleted, or you might not have access to it." : parseApiError(error).message}
        action={
          notFound ? (
            <Button variant="secondary" asChild>
              <Link to={paths.projectIssues(projectId)}>Back to issues</Link>
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
              <RotateCw />
              Try again
            </Button>
          )
        }
      />
    )
  }

  // Keys are unique per workspace; fix up links that use the wrong project
  if (issue.projectId !== projectId) return <Navigate to={paths.issue(issue)} replace />

  return <IssueDetail issue={issue} />
}
