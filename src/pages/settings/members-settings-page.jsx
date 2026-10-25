import { useState } from "react"
import { Lock, LogOut, MailPlus, MoreHorizontal, Search, UserMinus, Users } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import {
  useActiveWorkspace,
  useCurrentMember,
  useInvitations,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
  useWorkspaceAccess,
} from "@/api/hooks"
import { RoleBadge } from "@/components/rbac/role-badge"
import { restrictedReasons } from "@/components/rbac/reasons"
import { Restricted } from "@/components/rbac/restricted"
import { InviteDialog } from "@/components/settings/invite-dialog"
import { RoleOptions } from "@/components/settings/role-options"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { parseApiError } from "@/lib/api-errors"
import { formatDate } from "@/lib/dates"
import { formatRelativeTime } from "@/lib/utils"
import { PERMS, roleWithArticle, WORKSPACE_ROLES, workspaceRoleConfig, workspaceRoleLabel } from "@/models/roles"

/** Why the caller can't change this member, or null when they can. */
function lockReason(member, me, canManage) {
  if (member.permissions.canChangeRole) return null
  if (member.id === me?.id) return restrictedReasons.self
  return canManage ? restrictedReasons.higherRole : restrictedReasons.manageMembers
}

function RoleCell({ member, me, assignableRoles, canManage, onChange }) {
  if (member.permissions.canChangeRole) {
    // NativeSelect fills its parent, so the wrapper sets the width
    return (
      <div className="w-full max-w-44">
        <NativeSelect
          aria-label={`Role for ${member.name}`}
          value={member.role}
          onChange={(event) => onChange(member, event.target.value)}
          className="h-8"
        >
          <RoleOptions assignable={assignableRoles} current={member.role} />
        </NativeSelect>
      </div>
    )
  }
  const reason = lockReason(member, me, canManage)
  // Only explain when the caller manages members; for everyone else it's just a label
  if (!canManage) return <RoleBadge role={member.role} />
  return (
    <Restricted reason={reason}>
      <span className="inline-flex items-center gap-1.5">
        <RoleBadge role={member.role} />
        <Lock aria-hidden="true" className="size-3.5 text-muted-foreground" />
        <span className="sr-only">{reason}</span>
      </span>
    </Restricted>
  )
}

function MemberActions({ member, canManage, onRemove, onLeave }) {
  const { canRemove, canLeave } = member.permissions
  if (!canRemove && !canLeave) {
    if (!canManage) return null
    return (
      <Restricted reason={restrictedReasons.higherRole} side="left">
        <Button variant="ghost" size="icon-sm" disabled aria-label={`Actions for ${member.name}`}>
          <MoreHorizontal />
        </Button>
      </Restricted>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.name}`} className="text-muted-foreground">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canRemove && (
          <DropdownMenuItem variant="destructive" onSelect={() => onRemove(member)}>
            <UserMinus />
            Remove from workspace
          </DropdownMenuItem>
        )}
        {canLeave && (
          <DropdownMenuItem variant="destructive" onSelect={() => onLeave(member)}>
            <LogOut />
            Leave workspace
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const isDowngrade = (from, to) => workspaceRoleConfig[to].rank < workspaceRoleConfig[from].rank

function MembersTable({ members, me, access, onRoleChange, onRemove, onLeave }) {
  const canManage = access.can(PERMS.membersManage)
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
      {/* Fixed layout: the member column shrinks (names truncate) so phones don't scroll sideways */}
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">Workspace members and their roles</caption>
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">
              Member
            </th>
            <th scope="col" className="w-36 px-2 py-2.5 font-medium sm:w-52 sm:px-4">
              Role
            </th>
            <th scope="col" className="hidden w-36 px-4 py-2.5 font-medium md:table-cell">
              Joined
            </th>
            <th scope="col" className="w-12 px-2 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => (
            <tr key={member.id}>
              <td className="px-3 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar name={member.name} className="hidden sm:flex" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <Link to={`/team/members/${member.id}`} className="focus-ring truncate rounded-sm hover:text-primary">
                        {member.name}
                      </Link>
                      {member.id === me?.id && <Badge variant="primary">You</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-2 py-3 sm:px-4">
                <RoleCell member={member} me={me} assignableRoles={access.assignableRoles} canManage={canManage} onChange={onRoleChange} />
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{member.joinedAt ? formatDate(member.joinedAt) : "–"}</td>
              <td className="px-2 py-3 text-right">
                <MemberActions member={member} canManage={canManage} onRemove={onRemove} onLeave={onLeave} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InvitationsSection({ access }) {
  const canInvite = access.can(PERMS.membersInvite)
  const { data: invitations = [], isPending, isError } = useInvitations({ enabled: canInvite })
  const revoke = useRevokeInvitation()
  const [revoking, setRevoking] = useState(null)
  const [error, setError] = useState(null)

  if (!canInvite) return null

  async function confirmRevoke() {
    setError(null)
    try {
      await revoke.mutateAsync(revoking.id)
      toast.success(`Invitation for ${revoking.email} revoked`)
      setRevoking(null)
    } catch (err) {
      setError(parseApiError(err, "Couldn't revoke the invitation.").message)
    }
  }

  return (
    <section aria-labelledby="pending-invitations">
      <h2 id="pending-invitations" className="mb-3">
        Pending invitations <span className="font-normal text-muted-foreground">· {invitations.length}</span>
      </h2>
      {isPending ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : isError ? (
        <Alert variant="danger">Couldn't load invitations.</Alert>
      ) : invitations.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">No pending invitations.</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-xs">
          {invitations.map((invitation) => (
            <li key={invitation.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{invitation.email}</p>
                <p className="text-xs text-muted-foreground">
                  {invitation.invitedBy ? `Invited by ${invitation.invitedBy.name} ` : "Invited "}
                  {formatRelativeTime(invitation.createdAt)} · expires {formatDate(invitation.expiresAt)}
                </p>
              </div>
              <RoleBadge role={invitation.role} />
              <Restricted reason={invitation.permissions.canRevoke ? null : restrictedReasons.higherRole} side="left">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!invitation.permissions.canRevoke}
                  onClick={() => {
                    setError(null)
                    setRevoking(invitation)
                  }}
                >
                  Revoke
                </Button>
              </Restricted>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(revoking)}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Revoke this invitation?"
        description={revoking ? `The link sent to ${revoking.email} will stop working. You can invite them again later.` : ""}
        confirmLabel="Revoke invitation"
        onConfirm={confirmRevoke}
        pending={revoke.isPending}
        error={error}
      />
    </section>
  )
}

/**
 * Workspace member management. Controls follow the permissions the API
 * returns for the caller and for each member; the API re-checks every change.
 */
export function MembersSettingsPage() {
  const navigate = useNavigate()
  const access = useWorkspaceAccess()
  const { workspace } = useActiveWorkspace()
  const { data: me } = useCurrentMember()
  const { data: members = [], isPending, isError, refetch } = useMembers()
  const updateRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  // { kind: "role" | "remove" | "leave", member, role? }
  const [pending, setPending] = useState(null)
  const [dialogError, setDialogError] = useState(null)

  const q = query.trim().toLowerCase()
  const visible = members.filter(
    (m) => (!q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)) && (!roleFilter || m.role === roleFilter)
  )
  const canInvite = access.can(PERMS.membersInvite)

  async function applyRole(member, role) {
    try {
      await updateRole.mutateAsync({ userId: member.id, role })
      toast.success(`${member.name} is now ${roleWithArticle(role)}`)
      return true
    } catch (error) {
      const message = parseApiError(error, "Couldn't change the role.").message
      if (pending) setDialogError(message)
      else toast.error("Couldn't change the role", { description: message })
      return false
    }
  }

  function requestRoleChange(member, role) {
    if (role === member.role) return
    // Granting ownership or reducing someone's access gets a confirmation step
    if (role === "owner" || isDowngrade(member.role, role)) {
      setDialogError(null)
      setPending({ kind: "role", member, role })
    } else {
      applyRole(member, role)
    }
  }

  async function confirm() {
    setDialogError(null)
    const { kind, member, role } = pending
    if (kind === "role") {
      if (await applyRole(member, role)) setPending(null)
      return
    }
    try {
      await removeMember.mutateAsync(member.id)
      setPending(null)
      if (kind === "leave") {
        toast.success(`You left ${workspace?.name ?? "the workspace"}`)
        navigate("/")
      } else {
        toast.success(`${member.name} was removed`)
      }
    } catch (error) {
      setDialogError(parseApiError(error, "Something went wrong.").message)
    }
  }

  const dialog = pending && {
    role: {
      title: pending.role === "owner" ? `Make ${pending.member.name} an owner?` : `Change ${pending.member.name}'s role?`,
      description:
        pending.role === "owner"
          ? "Owners have full control, including deleting the workspace and managing other owners."
          : `${workspaceRoleLabel(pending.member.role)} → ${workspaceRoleLabel(pending.role)}. They'll lose anything ${roleWithArticle(pending.role)} can't do, immediately.`,
      confirmLabel: pending.role === "owner" ? "Make owner" : "Change role",
      destructive: pending.role !== "owner",
    },
    remove: {
      title: `Remove ${pending.member.name}?`,
      description: `They'll lose access to every project and issue in ${workspace?.name ?? "this workspace"} right away, and their open issues become unassigned. You can invite them again later.`,
      confirmLabel: "Remove member",
      destructive: true,
    },
    leave: {
      title: `Leave ${workspace?.name ?? "this workspace"}?`,
      description: "You'll lose access to its projects and issues right away. To come back you'll need a new invitation.",
      confirmLabel: "Leave workspace",
      destructive: true,
    },
  }[pending.kind]

  return (
    <div className="grid gap-8">
      <section aria-labelledby="members-heading" className="grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="members-heading">
            Members <span className="font-normal text-muted-foreground">· {members.length}</span>
          </h2>
          <Restricted reason={canInvite ? null : restrictedReasons.invite}>
            {canInvite ? (
              <InviteDialog>
                <Button>
                  <MailPlus />
                  Invite people
                </Button>
              </InviteDialog>
            ) : (
              <Button disabled>
                <MailPlus />
                Invite people
              </Button>
            )}
          </Restricted>
        </div>

        {!access.can(PERMS.membersManage) && (
          <Alert variant="info">
            You're {roleWithArticle(access.role)}. You can see who's here, but only
            owners and admins can change roles or remove people.
          </Alert>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="sm:w-72">
            <Input
              type="search"
              leadingIcon={Search}
              placeholder="Search by name or email"
              aria-label="Search members"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="sm:w-48">
            <NativeSelect aria-label="Filter by role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">All roles</option>
              {WORKSPACE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {isPending ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : isError ? (
          <Alert variant="danger" action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>}>
            Couldn't load members.
          </Alert>
        ) : visible.length === 0 ? (
          <EmptyState variant="bordered" icon={Users} title="No members match" description="Try another name, email or role." />
        ) : (
          <MembersTable
            members={visible}
            me={me}
            access={access}
            onRoleChange={requestRoleChange}
            onRemove={(member) => {
              setDialogError(null)
              setPending({ kind: "remove", member })
            }}
            onLeave={(member) => {
              setDialogError(null)
              setPending({ kind: "leave", member })
            }}
          />
        )}
      </section>

      <InvitationsSection access={access} />

      {dialog && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          destructive={dialog.destructive}
          onConfirm={confirm}
          pending={updateRole.isPending || removeMember.isPending}
          error={dialogError}
        />
      )}
    </div>
  )
}
