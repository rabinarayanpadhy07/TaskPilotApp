import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useLocation } from "react-router"

import { AuthCard, AuthLink } from "@/components/auth/auth-layout"
import { PasswordInput } from "@/components/auth/password-input"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { getRedirectTarget, withRedirect } from "@/lib/redirect"
import { useAuthStore } from "@/stores/auth-store"
import { loginSchema } from "@/validation/auth-schemas"

export function LoginPage() {
  const location = useLocation()
  const login = useAuthStore((state) => state.login)
  const notice = useAuthStore((state) => state.notice)
  const clearNotice = useAuthStore((state) => state.clearNotice)
  const [formError, setFormError] = useState(null)
  const redirect = getRedirectTarget(location)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { email: new URLSearchParams(location.search).get("email") ?? "", password: "", remember: true },
  })

  async function onSubmit(values) {
    setFormError(null)
    clearNotice()
    try {
      // On success the store flips to "authenticated" and GuestRoute redirects
      await login(values)
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(setError, fieldErrors, { email: "email", password: "password" })
      setFormError(message || unmatched.join(" ") || null)
    }
  }

  return (
    <>
      <AuthCard
        title="Welcome back"
        description="Sign in to your TaskPilot account."
        footer={
          <>
            New to TaskPilot? <AuthLink to={withRedirect("/register", redirect)}>Create an account</AuthLink>
          </>
        }
      >
        <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          {notice && !formError && <Alert variant="warning">{notice}</Alert>}
          {formError && <Alert variant="danger">{formError}</Alert>}

          <FormField id="login-email" label="Email" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="name@company.com"
              autoFocus
              {...register("email")}
            />
          </FormField>

          <FormField id="login-password" label="Password" error={errors.password?.message}>
            <PasswordInput autoComplete="current-password" {...register("password")} />
          </FormField>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground select-none">
            <input
              type="checkbox"
              className="size-4 cursor-pointer rounded-sm accent-primary"
              {...register("remember")}
            />
            Keep me signed in
          </label>

          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </AuthCard>
    </>
  )
}
