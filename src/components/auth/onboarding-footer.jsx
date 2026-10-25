import { useNavigate } from "react-router"

import { useAuthStore } from "@/stores/auth-store"

/** "Signed in as … · Sign out" line at the bottom of onboarding cards. */
export function OnboardingFooter() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  if (!user) return null

  return (
    <p>
      Signed in as <span className="font-medium text-foreground">{user.email}</span> ·{" "}
      <button
        type="button"
        className="focus-ring cursor-pointer rounded-sm font-medium text-primary underline-offset-4 hover:underline"
        onClick={async () => {
          await logout()
          navigate("/login")
        }}
      >
        Sign out
      </button>
    </p>
  )
}
