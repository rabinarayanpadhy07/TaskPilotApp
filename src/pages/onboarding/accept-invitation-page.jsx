import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MailWarning, RotateCw, Users } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"

import { queryKeys } from "@/api/hooks"
import { AuthCard, AuthLink } from "@/components/auth/auth-layout"
import { OnboardingFooter } from "@/components/auth/onboarding-footer"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { parseApiError } from "@/lib/api-errors"
import { withRedirect } from "@/lib/redirect"
import { roleWithArticle } from "@/models/roles"
import { workspaceService } from "@/services/workspace-service"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"

function InvitationSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading invitation" className="rounded-xl border bg-surface px-5 py-7 shadow-sm sm:px-8 sm:py-8">
      <Skeleton className="size-10 rounded-lg" />
      <Skeleton className="mt-5 h-5 w-2/3" />
      <Skeleton className="mt-3 h-3.5 w-full" />
      <Skeleton className="mt-8 h-10 w-full" />
    </section>
  )
}

/**
 * Public page behind an invitation link. Loads the invitation from the API;
 * accepting it requires a signed-in account (sign-in/registration return here).
 */
export function AcceptInvitationPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { status, user } = useAuthStore()
  const queryClient = useQueryClient()
  const setActiveWorkspaceId = useUIStore((state) => state.setActiveWorkspaceId)
  const returnTo = `/invite/${encodeURIComponent(token)}`

  const invitation = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => workspaceService.getInvitation(token),
    retry: false,
  })

  const accept = useMutation({
    mutationFn: () => workspaceService.acceptInvitation(token),
    onSuccess: async (workspace) => {
      // The new workspace must be in the list before it can become active
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
      setActiveWorkspaceId(workspace.id)
      navigate("/", { replace: true })
    },
  })

  if (invitation.isPending) return <InvitationSkeleton />

  if (invitation.isError) {
    const { status: httpStatus, message } = parseApiError(invitation.error)
    const notFound = httpStatus === 404 || httpStatus === 410

    return (
      <AuthCard
        icon={MailWarning}
        title={notFound ? "This invitation isn't valid" : "We couldn't load this invitation"}
        description={
          notFound
            ? "The link may have expired or already been used. Ask a workspace admin to send you a new invitation."
            : message
        }
        footer={
          <>
            Have a different code? <AuthLink to="/join">Enter it here</AuthLink>
          </>
        }
      >
        {notFound ? (
          <Button variant="secondary" className="w-full" asChild>
            <Link to="/">Go to TaskPilot</Link>
          </Button>
        ) : (
          <Button variant="secondary" className="w-full" loading={invitation.isFetching} onClick={() => invitation.refetch()}>
            <RotateCw />
            Try again
          </Button>
        )}
      </AuthCard>
    )
  }

  const { workspace, invitedBy, email, role } = invitation.data
  const isSignedIn = status === "authenticated"
  const emailMismatch = isSignedIn && email && user?.email?.toLowerCase() !== email.toLowerCase()
  const acceptError = accept.isError ? parseApiError(accept.error).message : null

  return (
    <AuthCard
      icon={Users}
      title={`Join ${workspace.name}`}
      description={
        <>
          {invitedBy ? `${invitedBy} invited you` : "You've been invited"} to collaborate in{" "}
          <span className="font-medium text-foreground">{workspace.name}</span>
          {role ? ` as ${roleWithArticle(role)}` : ""}.
        </>
      }
      footer={isSignedIn ? <OnboardingFooter /> : null}
    >
      <div className="grid gap-5">
        {acceptError && <Alert variant="danger">{acceptError}</Alert>}
        {emailMismatch && (
          <Alert variant="warning" title="Different email address">
            This invitation was sent to {email}, but you're signed in as {user.email}. You may need to sign in with
            the invited address.
          </Alert>
        )}

        {isSignedIn ? (
          <Button size="lg" className="w-full" loading={accept.isPending} onClick={() => accept.mutate()}>
            {accept.isPending ? "Joining…" : `Join ${workspace.name}`}
          </Button>
        ) : (
          <>
            <Button size="lg" className="w-full" asChild>
              <Link to={withRedirect("/register", returnTo) + (email ? `&email=${encodeURIComponent(email)}` : "")}>
                Create an account to join
              </Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <AuthLink to={withRedirect("/login", returnTo) + (email ? `&email=${encodeURIComponent(email)}` : "")}>
                Sign in
              </AuthLink>
            </p>
          </>
        )}
      </div>
    </AuthCard>
  )
}
