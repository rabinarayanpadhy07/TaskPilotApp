import { zodResolver } from "@hookform/resolvers/zod"
import { Ticket } from "lucide-react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router"

import { AuthCard, AuthLink } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/stores/auth-store"
import { extractInviteToken, joinWorkspaceSchema } from "@/validation/auth-schemas"

/**
 * Entry point for people who received an invitation but didn't open the link
 * directly. Parses the link/code locally and hands off to /invite/:token,
 * which loads the invitation from the API.
 */
export function JoinWorkspacePage() {
  const navigate = useNavigate()
  const isSignedIn = useAuthStore((state) => state.status === "authenticated")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(joinWorkspaceSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { invite: "" },
  })

  function onSubmit({ invite }) {
    navigate(`/invite/${encodeURIComponent(extractInviteToken(invite))}`)
  }

  return (
    <AuthCard
      icon={Ticket}
      title="Join a workspace"
      description="Paste the invitation link from your email, or enter the invite code you were given."
      footer={
        isSignedIn ? (
          <>
            Want your own workspace? <AuthLink to="/onboarding/workspace">Create one</AuthLink>
          </>
        ) : (
          <>
            Already a member? <AuthLink to="/login">Sign in</AuthLink>
          </>
        )
      }
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          id="join-invite"
          label="Invitation link or code"
          error={errors.invite?.message}
          hint={`Looks like ${window.location.origin}/invite/AbC123… or just the code`}
        >
          <Input autoComplete="off" autoCapitalize="none" spellCheck="false" autoFocus {...register("invite")} />
        </FormField>
        <Button type="submit" size="lg" className="w-full">
          Continue
        </Button>
      </form>
    </AuthCard>
  )
}
