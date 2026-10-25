import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Minus } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link } from "react-router"
import { toast } from "sonner"

import { useActiveWorkspace, useUpdateWorkspace, useWorkspaceAccess } from "@/api/hooks"
import { restrictedReasons } from "@/components/rbac/reasons"
import { RoleBadge } from "@/components/rbac/role-badge"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { PERMS, ROLE_CAPABILITIES, workspaceRoleConfig } from "@/models/roles"
import { workspaceSchema } from "@/validation/auth-schemas"

function WorkspaceForm({ workspace, canEdit }) {
  const update = useUpdateWorkspace()
  const [formError, setFormError] = useState(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(workspaceSchema), defaultValues: { name: workspace.name, slug: workspace.slug ?? "" } })

  async function onSubmit(values) {
    setFormError(null)
    try {
      const saved = await update.mutateAsync(values)
      reset({ name: saved.name, slug: saved.slug })
      toast.success("Workspace updated")
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error, "Couldn't save the workspace.")
      const unmatched = applyFieldErrors(setError, fieldErrors, { name: "name", slug: "slug" })
      setFormError([message, ...unmatched].filter(Boolean).join(" ") || null)
    }
  }

  return (
    <form className="grid max-w-md gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {!canEdit && <Alert variant="info">{restrictedReasons.workspaceSettings}</Alert>}
      {formError && <Alert variant="danger">{formError}</Alert>}
      <FormField id="workspace-name" label="Name" error={errors.name?.message}>
        <Input disabled={!canEdit} {...register("name")} />
      </FormField>
      <FormField id="workspace-slug" label="Short name" error={errors.slug?.message} hint="Lowercase letters, numbers and hyphens.">
        <Input disabled={!canEdit} autoCapitalize="none" spellCheck="false" {...register("slug")} />
      </FormField>
      {canEdit && (
        <div>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      )}
    </form>
  )
}

/** Workspace details and a plain-language summary of what the caller's role allows. */
export function GeneralSettingsPage() {
  const { workspace, isPending } = useActiveWorkspace()
  const { role, can } = useWorkspaceAccess()

  if (isPending || !workspace) return <Skeleton className="h-48 w-full rounded-lg" />

  return (
    <div className="grid gap-6">
      <section aria-labelledby="settings-workspace" className="rounded-lg border bg-card p-5 shadow-xs">
        <h2 id="settings-workspace">Workspace</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {workspace.memberIds.length} {workspace.memberIds.length === 1 ? "member" : "members"}
        </p>
        {/* Remount when switching workspaces so the form shows the right values */}
        <WorkspaceForm key={workspace.id} workspace={workspace} canEdit={can(PERMS.workspaceUpdate)} />
      </section>

      <section aria-labelledby="settings-access" className="rounded-lg border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="settings-access">Your access</h2>
          <RoleBadge role={role} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{workspaceRoleConfig[role]?.description}</p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {ROLE_CAPABILITIES.flatMap((group) => group.items).map((item) => {
            const allowed = item.roles.includes(role)
            const Icon = allowed ? Check : Minus
            return (
              <li key={item.label} className="flex items-start gap-2">
                <Icon aria-hidden="true" className={allowed ? "mt-0.5 size-4 shrink-0 text-primary" : "mt-0.5 size-4 shrink-0 text-muted-foreground/60"} />
                <span className={allowed ? "" : "text-muted-foreground"}>
                  <span className="sr-only">{allowed ? "Allowed: " : "Not allowed: "}</span>
                  {item.label}
                  {allowed && item.note && <span className="text-muted-foreground"> ({item.note.toLowerCase()})</span>}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          See every role in{" "}
          <Link to="/settings/roles" className="focus-ring rounded-sm font-medium text-primary hover:underline">
            Roles & permissions
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
