import { Link, Outlet } from "react-router"

import { Brand } from "@/components/layout/brand"
import { cn } from "@/lib/utils"

/** Centered, spacious layout shared by sign-in and onboarding pages. */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center px-4 py-10 sm:justify-center sm:py-16"
      >
        <div className="w-full max-w-[400px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

/**
 * Card with the TaskPilot logo, a concise heading and an optional `icon` beside
 * the logo. `footer` renders at the bottom of the card, below a divider
 * (e.g. "New to TaskPilot? Create an account").
 */
export function AuthCard({ title, description, children, footer, icon: Icon }) {
  return (
    <section
      aria-labelledby="auth-title"
      className="rounded-xl border bg-surface px-5 py-7 shadow-sm sm:px-8 sm:py-8"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link to="/" aria-label="TaskPilot home" className="focus-ring flex w-fit rounded-md">
          <Brand />
        </Link>
        {Icon && (
          <div className="flex size-10 items-center justify-center rounded-lg border border-primary/10 bg-selected text-primary">
            <Icon aria-hidden="true" className="size-5" />
          </div>
        )}
      </div>
      <h1 id="auth-title" className="text-xl">
        {title}
      </h1>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-7">{children}</div>
      {footer && (
        <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">{footer}</div>
      )}
    </section>
  )
}

/** Inline text link styled for auth pages. */
export function AuthLink({ className, ...props }) {
  return (
    <Link
      className={cn("focus-ring rounded-sm font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline", className)}
      {...props}
    />
  )
}
