import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Copy, MailCheck } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { useCreateInvitation, useWorkspaceAccess } from "@/api/hooks"
import { RoleOptions } from "@/components/settings/role-options"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { workspaceRoleLabel } from "@/models/roles"
import { inviteSchema } from "@/validation/access-schemas"

function CopyLink({ url }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy the link. Select it and copy it manually.")
    }
  }
  return (
    <div className="flex gap-2">
      <Input readOnly value={url} aria-label="Invitation link" onFocus={(event) => event.target.select()} className="font-mono text-xs" />
      <Button variant="secondary" onClick={copy} className="shrink-0">
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

/**
 * Invite someone to the workspace. Roles offered are the ones the API says the
 * caller may grant (`assignableRoles`); the API checks again on submit.
 */
export function InviteDialog({ children }) {
  const { assignableRoles } = useWorkspaceAccess()
  const createInvitation = useCreateInvitation()
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState(null)
  const [formError, setFormError] = useState(null)
  const defaultRole = assignableRoles.includes("developer") ? "developer" : (assignableRoles.at(-1) ?? "viewer")

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(inviteSchema), defaultValues: { email: "", role: defaultRole } })
  const role = useWatch({ control, name: "role" })

  function handleOpenChange(next) {
    setOpen(next)
    if (next) {
      reset({ email: "", role: defaultRole })
      setCreated(null)
      setFormError(null)
    }
  }

  async function onSubmit(values) {
    setFormError(null)
    try {
      setCreated(await createInvitation.mutateAsync(values))
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error, "Couldn't send the invitation.")
      const unmatched = applyFieldErrors(setError, fieldErrors, { email: "email", role: "role" })
      setFormError([message, ...unmatched].filter(Boolean).join(" ") || null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailCheck aria-hidden="true" className="size-4 text-success-text" />
                Invitation created
              </DialogTitle>
              <DialogDescription>
                {created.email} is invited as {workspaceRoleLabel(created.role)}.{" "}
                We've emailed them a link. You can also share this
                link yourself. It works once, for that address only, and isn't shown again.
              </DialogDescription>
            </DialogHeader>
            {created.inviteUrl && <CopyLink url={created.inviteUrl} />}
            <DialogFooter>
              <Button variant="secondary" onClick={() => handleOpenChange(true)}>
                Invite someone else
              </Button>
              <DialogClose asChild>
                <Button>Done</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite people</DialogTitle>
              <DialogDescription>They'll get a link to join this workspace with the role you choose.</DialogDescription>
            </DialogHeader>
            <form id="invite-form" noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
              {formError && <Alert variant="danger">{formError}</Alert>}
              <FormField id="invite-email" label="Email address" error={errors.email?.message}>
                <Input type="email" autoComplete="off" placeholder="name@company.com" autoFocus {...register("email")} />
              </FormField>
              <FormField id="invite-role" label="Role" error={errors.role?.message} hint={<RoleOptions.Description role={role} />}>
                <NativeSelect {...register("role")}>
                  <RoleOptions assignable={assignableRoles} />
                </NativeSelect>
              </FormField>
            </form>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" form="invite-form" loading={isSubmitting}>
                Send invitation
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
