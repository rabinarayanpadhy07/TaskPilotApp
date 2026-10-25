import { ListTodo, Mail } from "lucide-react"
import { Link, useParams } from "react-router"

import { useIssues, useMembers, useProjects, useTeams } from "@/api/hooks"
import { IssueList, IssueListSkeleton, IssueRow } from "@/components/issues/issue-row"
import { EmptyState } from "@/components/ui/empty-state"
import { QueryError } from "@/components/ui/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { compareIssuesByUrgency, isDone } from "@/models/issue"
import { NotFoundPage } from "@/pages/not-found-page"

/** A workspace member: profile, teams and the open issues assigned to them. */
export function MemberPage() {
  const { memberId } = useParams()
  const { data: members, isPending, error, refetch } = useMembers()
  const { data: teams = [] } = useTeams()
  const { data: projects = [] } = useProjects()
  const { data: issues = [], isPending: issuesPending, error: issuesError, refetch: refetchIssues } = useIssues({ assigneeId: memberId })
  const member = members?.find((m) => m.id === memberId)
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]))

  if (error) return <QueryError error={error} title="Couldn't load this member" onRetry={refetch} />
  if (isPending) return <Skeleton className="h-24 w-full rounded-lg" />
  if (!member) return <NotFoundPage />

  const memberTeams = teams.filter((team) => team.memberIds.includes(member.id))
  const open = issues.filter((issue) => !isDone(issue) && issue.type !== "epic").sort(compareIssuesByUrgency)

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar name={member.name} size="lg" className="size-14 text-lg" />
        <div className="min-w-0">
          <h1>{member.name}</h1>
          <p className="text-sm text-muted-foreground">{member.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <a href={`mailto:${member.email}`} className="focus-ring inline-flex items-center gap-1.5 rounded-sm text-muted-foreground hover:text-foreground">
              <Mail aria-hidden="true" className="size-3.5" />
              {member.email}
            </a>
            {memberTeams.map((team) => (
              <Link key={team.id} to={`/team/${team.id}`} className="focus-ring rounded-full border bg-surface px-2 py-0.5 text-xs hover:border-input">
                {team.name}
              </Link>
            ))}
          </p>
        </div>
      </div>

      <section aria-labelledby="member-issues">
        <h2 id="member-issues" className="mb-3">
          Open issues <span className="font-normal text-muted-foreground">· {open.length}</span>
        </h2>
        {issuesError ? (
          <QueryError error={issuesError} title="Couldn't load their issues" onRetry={refetchIssues} />
        ) : issuesPending ? (
          <IssueListSkeleton rows={3} />
        ) : open.length === 0 ? (
          <EmptyState variant="bordered" className="py-8" icon={ListTodo} title="Nothing assigned" description={`${member.name} has no open issues.`} />
        ) : (
          <IssueList label={`Open issues assigned to ${member.name}`}>
            {open.map((issue) => (
              <li key={issue.id}>
                <IssueRow issue={issue} assignee={member} projectName={projectsById[issue.projectId]?.name} />
              </li>
            ))}
          </IssueList>
        )}
      </section>
    </div>
  )
}
