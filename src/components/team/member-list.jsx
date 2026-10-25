import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"

/** Bordered list of people with their title and email. */
export function MemberList({ members, isPending, currentUserId, leadId }) {
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-xs">
      {isPending
        ? Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-3 w-40" />
            </li>
          ))
        : members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <UserAvatar name={member.name} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  <Link to={`/team/members/${member.id}`} className="focus-ring truncate rounded-sm hover:text-primary">
                    {member.name}
                  </Link>
                  {member.id === leadId && <Badge variant="outline">Lead</Badge>}
                  {member.id === currentUserId && <Badge variant="primary">You</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.title}</p>
              </div>
              <a
                href={`mailto:${member.email}`}
                className="focus-ring hidden rounded-sm text-sm text-muted-foreground hover:text-foreground sm:block"
              >
                {member.email}
              </a>
            </li>
          ))}
    </ul>
  )
}
