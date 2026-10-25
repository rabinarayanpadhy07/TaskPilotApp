import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { Building2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router"

import { queryKeys } from "@/api/hooks"
import { AuthCard, AuthLink } from "@/components/auth/auth-layout"
import { OnboardingFooter } from "@/components/auth/onboarding-footer"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { workspaceService } from "@/services/workspace-service"
import { useUIStore } from "@/stores/ui-store"
import { workspaceSchema } from "@/validation/auth-schemas"

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

export function CreateWorkspacePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setActiveWorkspaceId = useUIStore((state) => state.setActiveWorkspaceId)
  const [formError, setFormError] = useState(null)
  const [slugEdited, setSlugEdited] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(workspaceSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { name: "", slug: "" },
  })

  const nameField = register("name", {
    onChange: (event) => {
      // Keep the URL in sync with the name until the user edits it directly
      if (!slugEdited) setValue("slug", toSlug(event.target.value), { shouldValidate: Boolean(errors.slug) })
    },
  })
  const slugField = register("slug")

  async function onSubmit(values) {
    setFormError(null)
    try {
      const workspace = await workspaceService.createWorkspace(values)
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
      setActiveWorkspaceId(workspace.id)
      navigate("/", { replace: true })
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(setError, fieldErrors, { name: "name", slug: "slug" })
      setFormError(message || unmatched.join(" ") || null)
    }
  }

  return (
    <AuthCard
      icon={Building2}
      title="Create your workspace"
      description="A workspace is where your team plans projects and tracks work together."
      footer={<OnboardingFooter />}
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <Alert variant="danger">{formError}</Alert>}

        <FormField id="workspace-name" label="Workspace name" error={errors.name?.message}>
          <Input autoComplete="organization" placeholder="e.g. Acme Design" autoFocus {...nameField} />
        </FormField>

        <FormField
          id="workspace-slug"
          label="Short name"
          error={errors.slug?.message}
          hint="A unique identifier for the workspace: lowercase letters, numbers and hyphens."
        >
          <Input
            autoComplete="off"
            autoCapitalize="none"
            spellCheck="false"
            placeholder="acme-design"
            {...slugField}
            onChange={(event) => {
              // Normalize as the user types so what they see is what gets saved
              event.target.value = event.target.value.toLowerCase().replace(/\s+/g, "-")
              setSlugEdited(event.target.value !== "")
              slugField.onChange(event)
            }}
          />
        </FormField>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Creating workspace…" : "Create workspace"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Have an invitation? <AuthLink to="/join">Join a workspace</AuthLink>
        </p>
      </form>
    </AuthCard>
  )
}
