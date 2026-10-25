import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, CircleCheck, KeyRound } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useParams } from "react-router"

import { AuthCard, AuthLink } from "@/components/auth/auth-layout"
import { PasswordInput } from "@/components/auth/password-input"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { authService } from "@/services/auth-service"
import { resetPasswordSchema } from "@/validation/auth-schemas"

/** Target of the emailed reset link: /reset-password/:uid/:token */
export function ResetPasswordPage() {
  const { uid, token } = useParams()
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirm: "" } })

  async function onSubmit({ password }) {
    setFormError(null)
    try {
      await authService.confirmPasswordReset({ uid, token, password })
      setDone(true)
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error, "Couldn't reset your password.")
      const unmatched = applyFieldErrors(setError, fieldErrors, { password: "password" })
      setFormError([message, ...unmatched].filter(Boolean).join(" ") || null)
    }
  }

  const backLink = (
    <AuthLink to="/login" className="inline-flex items-center gap-1.5">
      <ArrowLeft aria-hidden="true" className="size-3.5" />
      Back to sign in
    </AuthLink>
  )

  if (done) {
    return (
      <AuthCard icon={CircleCheck} title="Password updated" description="You can now sign in with your new password. Other sessions were signed out." footer={backLink}>
        <Button size="lg" className="w-full" asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard icon={KeyRound} title="Choose a new password" description="Reset links work once and expire after a few hours." footer={backLink}>
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <Alert variant="danger">{formError}</Alert>}
        <FormField id="reset-password" label="New password" error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" autoFocus {...register("password")} />
        </FormField>
        <FormField id="reset-confirm" label="Confirm new password" error={errors.confirm?.message}>
          <PasswordInput autoComplete="new-password" {...register("confirm")} />
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Saving…" : "Set new password"}
        </Button>
      </form>
    </AuthCard>
  )
}
