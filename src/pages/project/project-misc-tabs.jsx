import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, UserMinus, UserPlus } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { Link } from "react-router"
import { toast } from "sonner"

import {
  useAddProjectMember,
  useCurrentMember,
  useMembers,
  useProjectMembers,
  useRemoveProjectMember,
  useUpdateProject,
  useUpdateProjectMember,
} from "@/api/hooks"
import { VisibilityField } from "@/components/projects/create-project-dialog"
import { ProjectRoleBadge, RoleBadge } from "@/components/rbac/role-badge"
import { restrictedReasons } from "@/components/rbac/reasons"
import { Restricted } from "@/components/rbac/restricted"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { NativeSelect } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { projectCan } from "@/models/project"
import { MAX_PROJECT_ROLE, PERMS, PROJECT_ROLES, projectRoleConfig, projectRoleLabel, workspaceRoleLabel } from "@/models/roles"
import { useRouteProject } from "@/pages/project/use-route-project"
import { projectMemberSchema } from "@/validation/access-schemas"

/** Project roles, with the ones above the person's workspace ceiling disabled. */
function ProjectRoleOptions({ workspaceRole }) {
  const ceiling = workspaceRole ? projectRoleConfig[MAX_PROJECT_ROLE[workspaceRole]].rank : 3
  return PROJECT_ROLES.map((role) => (
    <option key={role.value} value={role.value} disabled={role.rank > ceiling}>
      {role.label}
      {role.rank > ceiling ? ` (not for ${workspaceRoleLabel(workspaceRole)}s)` : ""}
    </option>
  ))
}

function AddMemberDialog({ project, candidates }) {
  const add = useAddProjectMember(project.id)
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState(null)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(projectMemberSchema), defaultValues: { userId: "", role: "contributor" } })
  const [userId, role] = useWatch({ control, name: ["userId", "role"] })
  const selected = candidates.find((m) => m.id === userId)

  async function onSubmit(values) {
    setFormError(null)
    try {
      await add.mutateAsync(values)
      toast.success(`${candidates.find((m) => m.id === values.userId)?.name ?? "Member"} added to ${project.name}`)
      setOpen(false)
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error, "Couldn't add the member.")
      const unmatched = applyFieldErrors(setError, fieldErrors, { user: "userId", role: "role" })
      setFormError([message, ...unmatched].filter(Boolean).join(" ") || null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          reset({ userId: "", role: "contributor" })
          setFormError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={candidates.length === 0}>
          <UserPlus />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add someone to {project.name}</DialogTitle>
          <DialogDescription>Only people already in this workspace can be added.</DialogDescription>
        </DialogHeader>
        <form id="add-project-member" noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          {formError && <Alert variant="danger">{formError}</Alert>}
          <FormField
            id="project-member-user"
            label="Person"
            error={errors.userId?.message}
            hint={selected ? `Workspace role: ${workspaceRoleLabel(selected.role)}` : undefined}
          >
            <NativeSelect {...register("userId")}>
              <option value="">Choose a member…</option>
              {candidates.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({workspaceRoleLabel(member.role)})
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            id="project-member-role"
            label="Project role"
            error={errors.role?.message}
            hint={projectRoleConfig[role]?.description}
          >
            <NativeSelect {...register("role")}>
              <ProjectRoleOptions workspaceRole={selected?.role} />
            </NativeSelect>
          </FormField>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="add-project-member" loading={isSubmitting}>
            Add member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AccessSettings({ project, canEdit, nonMemberCount }) {
  const update = useUpdateProject(project.id)
  const [confirmPrivate, setConfirmPrivate] = useState(false)
  const [error, setError] = useState(null)

  async function save(visibility) {
    setError(null)
    try {
      await update.mutateAsync({ visibility })
      toast.success(visibility === "private" ? `${project.name} is now private` : `${project.name} is now visible to the workspace`)
      setConfirmPrivate(false)
    } catch (err) {
      setError(parseApiError(err, "Couldn't change visibility.").message)
    }
  }

  return (
    <section aria-labelledby="project-access-heading" className="rounded-lg border bg-card p-5 shadow-xs">
      <h2 id="project-access-heading">Access</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Who can open this project. Workspace Owners and Admins always have access.
      </p>
      {canEdit ? (
        <VisibilityField
          name="project-visibility"
          value={project.visibility}
          onChange={(value) => {
            if (value === project.visibility || update.isPending) return
            if (value === "private") setConfirmPrivate(true)
            else save(value)
          }}
        />
      ) : (
        <Restricted reason={restrictedReasons.projectSettings}>
          <p className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
            <Lock aria-hidden="true" className="size-4 text-muted-foreground" />
            {project.visibility === "private" ? "Private: only project members" : "Workspace: everyone in the workspace"}
          </p>
        </Restricted>
      )}
      {error && !confirmPrivate && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}
      <ConfirmDialog
        open={confirmPrivate}
        onOpenChange={setConfirmPrivate}
        title="Make this project private?"
        description={
          nonMemberCount > 0
            ? `${nonMemberCount} ${nonMemberCount === 1 ? "person" : "people"} in the workspace who aren't project members (and aren't owners or admins) will lose access right away.`
            : "Only project members, owners and admins will be able to see it."
        }
        confirmLabel="Make private"
        onConfirm={() => save("private")}
        pending={update.isPending}
        error={error}
      />
    </section>
  )
}

export function ProjectMembersTab() {
  const { data: project } = useRouteProject()
  const { data: workspaceMembers = [] } = useMembers()
  const { data: me } = useCurrentMember()
  const { data: members = [], isPending, isError, refetch } = useProjectMembers(project.id)
  const updateMember = useUpdateProjectMember(project.id)
  const removeMember = useRemoveProjectMember(project.id)
  const [removing, setRemoving] = useState(null)
  const [removeError, setRemoveError] = useState(null)

  const canManage = projectCan(project, PERMS.projectMembersManage)
  const canEditSettings = projectCan(project, PERMS.projectUpdate)
  const memberIds = new Set(members.map((m) => m.id))
  const candidates = workspaceMembers.filter((m) => !memberIds.has(m.id))
  // People who'd lose access if the project went private (owners/admins keep it)
  const nonMemberCount = candidates.filter((m) => !["owner", "admin"].includes(m.role)).length
  const sorted = [...members].sort((a, b) => (a.id === project.leadId ? -1 : b.id === project.leadId ? 1 : a.name.localeCompare(b.name)))

  async function changeRole(member, role) {
    try {
      await updateMember.mutateAsync({ userId: member.id, role })
      toast.success(`${member.name} is now a project ${projectRoleLabel(role).toLowerCase()}`)
    } catch (error) {
      toast.error("Couldn't change the project role", { description: parseApiError(error).message })
    }
  }

  async function confirmRemove() {
    setRemoveError(null)
    try {
      await removeMember.mutateAsync(removing.id)
      toast.success(`${removing.name} removed from ${project.name}`)
      setRemoving(null)
    } catch (error) {
      setRemoveError(parseApiError(error, "Couldn't remove the member.").message)
    }
  }

  return (
    <div className="grid gap-6">
      <AccessSettings project={project} canEdit={canEditSettings} nonMemberCount={nonMemberCount} />

      <section aria-labelledby="project-members-heading" className="grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="project-members-heading">
              Members <span className="font-normal text-muted-foreground">· {members.length}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {project.visibility === "workspace"
                ? "Everyone in the workspace can also open this project with their workspace role. Members listed here can have a higher project role."
                : "Only these people (plus owners and admins) can see this private project."}
            </p>
          </div>
          {canManage ? (
            <AddMemberDialog project={project} candidates={candidates} />
          ) : (
            <Restricted reason={restrictedReasons.projectMembers}>
              <Button disabled>
                <UserPlus />
                Add member
              </Button>
            </Restricted>
          )}
        </div>

        {project.myRole && !canManage && (
          <Alert variant="info">
            You're a project {projectRoleLabel(project.myRole).toLowerCase()} here. Only project managers can change who has access.
          </Alert>
        )}

        {isPending ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : isError ? (
          <Alert variant="danger" action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>}>
            Couldn't load project members.
          </Alert>
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-xs">
            {sorted.map((member) => {
              const capped = member.effectiveRole && member.effectiveRole !== member.role
              return (
                <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <UserAvatar name={member.name} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <Link to={`/team/members/${member.id}`} className="focus-ring truncate rounded-sm hover:text-primary">
                        {member.name}
                      </Link>
                      {member.id === project.leadId && <Badge variant="outline">Lead</Badge>}
                      {member.id === me?.id && <Badge variant="primary">You</Badge>}
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      Workspace: <RoleBadge role={member.workspaceRole} />
                      {capped && <span>· acts as {projectRoleLabel(member.effectiveRole).toLowerCase()} (role ceiling)</span>}
                    </p>
                  </div>
                  {canManage ? (
                    <>
                      <div className="w-40">
                        <NativeSelect
                          aria-label={`Project role for ${member.name}`}
                          value={member.role}
                          disabled={updateMember.isPending}
                          onChange={(event) => changeRole(member, event.target.value)}
                          className="h-8"
                        >
                          <ProjectRoleOptions workspaceRole={member.workspaceRole} />
                        </NativeSelect>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${member.name} from ${project.name}`}
                        className="text-muted-foreground hover:text-danger-text"
                        onClick={() => {
                          setRemoveError(null)
                          setRemoving(member)
                        }}
                      >
                        <UserMinus />
                      </Button>
                    </>
                  ) : (
                    <ProjectRoleBadge role={member.role} />
                  )}
                </li>
              )
            })}
            {sorted.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted-foreground">No explicit members yet.</li>}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={removing ? `Remove ${removing.name} from ${project.name}?` : ""}
        description={
          project.visibility === "private"
            ? "They'll lose access to this private project and its issues right away."
            : "They'll keep the access their workspace role gives them, but lose any extra project role."
        }
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        pending={removeMember.isPending}
        error={removeError}
      />
    </div>
  )
}
