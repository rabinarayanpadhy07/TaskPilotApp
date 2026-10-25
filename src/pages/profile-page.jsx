import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { queryKeys, useCurrentUser } from "@/api/hooks"
import { PasswordInput } from "@/components/auth/password-input"
import { PageHeader } from "@/components/page-header"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { authService } from "@/services/auth-service"
import { useAuthStore } from "@/stores/auth-store"
import { changePasswordSchema, profileSchema } from "@/validation/auth-schemas"

function Section({ id, title, description, children }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border bg-card p-5 shadow-xs">
      <h2 id={id}>{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ProfileForm({ user }) {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const [formError, setFormError] = useState(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name, title: user.title ?? "" } })

  async function onSubmit(values) {
    setFormError(null)
    try {
      const updated = await authService.updateProfile(values)
      setUser(updated)
      // Member lists show the name too
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
      reset({ name: updated.name, title: updated.title })
      toast.success("Profile updated")
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(setError, fieldErrors, { full_name: "name", title: "title" })
      setFormError(message || unmatched.join(" ") || null)
    }
  }

  return (
    <form className="grid max-w-md gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}
      <FormField id="profile-name" label="Full name" error={errors.name?.message}>
        <Input autoComplete="name" {...register("name")} />
      </FormField>
      <FormField id="profile-title" label="Title" error={errors.title?.message} hint="Shown next to your name, e.g. Product Designer.">
        <Input autoComplete="organization-title" {...register("title")} />
      </FormField>
      <FormField id="profile-email" label="Email" hint="Your sign-in email can't be changed here.">
        <Input type="email" value={user.email} readOnly disabled />
      </FormField>
      <div>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save profile
        </Button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const [formError, setFormError] = useState(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } })

  async function onSubmit(values) {
    setFormError(null)
    try {
      await authService.changePassword(values)
      reset()
      toast.success("Password changed", { description: "Your other sessions were signed out." })
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(setError, fieldErrors, { current_password: "currentPassword", new_password: "newPassword" })
      setFormError(message || unmatched.join(" ") || null)
    }
  }

  return (
    <form className="grid max-w-md gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}
      <FormField id="password-current" label="Current password" error={errors.currentPassword?.message}>
        <PasswordInput autoComplete="current-password" {...register("currentPassword")} />
      </FormField>
      <FormField id="password-new" label="New password" error={errors.newPassword?.message}>
        <PasswordInput autoComplete="new-password" {...register("newPassword")} />
      </FormField>
      <FormField id="password-confirm" label="Confirm new password" error={errors.confirm?.message}>
        <PasswordInput autoComplete="new-password" {...register("confirm")} />
      </FormField>
      <div>
        <Button type="submit" variant="secondary" loading={isSubmitting}>
          Change password
        </Button>
      </div>
    </form>
  )
}

export function ProfilePage() {
  const { data: user } = useCurrentUser()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="How you appear to others in TaskPilot, and your sign-in settings." />
      {user ? (
        <>
          <div className="flex items-center gap-4">
            <UserAvatar name={user.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{[user.title, user.email].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <Section id="profile-details" title="Details">
            <ProfileForm user={user} />
          </Section>
          <Section id="profile-password" title="Password" description="Changing it signs you out everywhere else.">
            <PasswordForm />
          </Section>
        </>
      ) : (
        <Skeleton className="h-64 w-full rounded-lg" />
      )}
    </div>
  )
}
