import { Link } from "react-router"

import { useCurrentUser, useMembers, useTeams } from "@/api/hooks"
import { PageHeader } from "@/components/page-header"
import { ProjectTile } from "@/components/projects/project-tile"
import { MemberList } from "@/components/team/member-list"
import { QueryError } from "@/components/ui/query-error"

export function TeamPage() {
  const { data: members = [], isPending, error, refetch, isFetching } = useMembers()
  const { data: teams = [] } = useTeams()
  const { data: user } = useCurrentUser()

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Team"
        description="People and teams in this workspace."
      />

      {teams.length > 0 && (
        <section aria-labelledby="team-teams">
          <h2 id="team-teams" className="mb-3">
            Teams
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <li key={team.id}>
                <Link
                  to={`/team/${team.id}`}
                  className="focus-ring flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-xs transition-[border-color,box-shadow] hover:border-input hover:shadow-sm"
                >
                  <ProjectTile label={team.name} className="rounded-full" />
                  <span className="flex-1 truncate text-sm font-medium">{team.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {team.memberIds.length} {team.memberIds.length === 1 ? "member" : "members"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="team-members">
        <h2 id="team-members" className="mb-3">
          All members <span className="font-normal text-muted-foreground">· {members.length}</span>
        </h2>
        {error ? (
          <QueryError error={error} title="Couldn't load members" onRetry={refetch} retrying={isFetching} />
        ) : (
          <MemberList members={members} isPending={isPending} currentUserId={user?.id} />
        )}
      </section>
    </div>
  )
}
