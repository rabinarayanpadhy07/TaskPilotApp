import { useParams } from "react-router"

import { useCurrentUser, useMemberMap, useTeam } from "@/api/hooks"
import { PageHeader } from "@/components/page-header"
import { MemberList } from "@/components/team/member-list"
import { Skeleton } from "@/components/ui/skeleton"
import { NotFoundPage } from "@/pages/not-found-page"
import { QueryError } from "@/components/ui/query-error"

export function TeamDetailPage() {
  const { teamId } = useParams()
  const { data: team, isPending, error, refetch } = useTeam(teamId)
  const memberMap = useMemberMap()
  const { data: user } = useCurrentUser()

  if (error) return <QueryError error={error} title="Couldn't load this team" onRetry={refetch} />
  if (isPending) return <Skeleton className="h-5 w-48" />
  if (!team) return <NotFoundPage />

  const members = team.memberIds.map((id) => memberMap[id]).filter(Boolean)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={team.name}
        description={`${members.length} ${members.length === 1 ? "member" : "members"}. Team boards and workload views are coming soon.`}
      />
      <MemberList members={members} isPending={false} currentUserId={user?.id} />
    </div>
  )
}
