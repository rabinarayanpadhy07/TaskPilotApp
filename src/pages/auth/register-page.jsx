import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Circle } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useLocation } from "react-router"

import { AuthCard, AuthLink } from "@/components/auth/auth-layout"
import { PasswordInput } from "@/components/auth/password-input"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { getRedirectTarget, withRedirect } from "@/lib/redirect"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth-store"
import { passwordRules, registerSchema } from "@/validation/auth-schemas"

function PasswordChecklist({ control }) {
  const password = useWatch({ control, name: "password" }) ?? ""

  return (
    <ul className="grid gap-1" aria-label="Password requirements">
      {passwordRules.map((rule) => {
        const met = rule.test(password)
        const Icon = met ? Check : Circle
        return (
          <li key={rule.id} className={cn("flex items-center gap-1.5", met ? "text-success-text" : "text-muted-foreground")}>
            <Icon aria-hidden="true" className={cn("size-3.5", !met && "scale-75")} />
            {rule.label}
            <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function RegisterPage() {
  const location = useLocation()
  const registerAccount = useAuthStore((state) => state.register)
  const [formError, setFormError] = useState(null)
  const redirect = getRedirectTarget(location)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { fullName: "", email: new URLSearchParams(location.search).get("email") ?? "", password: "" },
  })

  async function onSubmit(values) {
    setFormError(null)
    try {
      // New accounts continue to workspace setup unless they came from an invitation
      await registerAccount(values, { redirectTo: redirect ?? "/onboarding/workspace" })
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(setError, fieldErrors, {
        full_name: "fullName",
        email: "email",
        password: "password",
      })
      setFormError(message || unmatched.join(" ") || null)
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Start planning and shipping work with your team."
      footer={
        <>
          Already have an account? <AuthLink to={withRedirect("/login", redirect)}>Sign in</AuthLink>
        </>
      }
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <Alert variant="danger">{formError}</Alert>}

        <FormField id="register-name" label="Full name" error={errors.fullName?.message}>
          <Input autoComplete="name" placeholder="e.g. Alex Morgan" autoFocus {...register("fullName")} />
        </FormField>

        <FormField id="register-email" label="Work email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@company.com"
            {...register("email")}
          />
        </FormField>

        <FormField
          id="register-password"
          label="Password"
          error={errors.password?.message}
          hint={<PasswordChecklist control={control} />}
        >
          <PasswordInput autoComplete="new-password" {...register("password")} />
        </FormField>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  )
}
