import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Globe, Lock } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { useCreateProject, useCurrentMember, useMembers, useWorkspaceAccess } from "@/api/hooks"
import { MemberSelect } from "@/components/issues/issue-fields"
import { restrictedReasons } from "@/components/rbac/reasons"
import { DisabledTrigger } from "@/components/rbac/restricted"
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
import { Textarea } from "@/components/ui/textarea"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { paths } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { PROJECT_PHASES, PROJECT_STATUSES, PROJECT_VISIBILITY, projectApiFieldMap, suggestProjectKey } from "@/models/project"
import { PERMS } from "@/models/roles"
import { projectFormSchema } from "@/validation/issue-schemas"

const visibilityIcons = { workspace: Globe, private: Lock }

/** Radio cards; arrow keys move between options (native radio group). */
export function VisibilityField({ value, onChange, name }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Visibility</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {PROJECT_VISIBILITY.map((option) => {
          const Icon = visibilityIcons[option.value]
          const checked = value === option.value
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-focus-visible:ring-[3px] has-focus-visible:ring-ring/70",
                checked ? "border-primary bg-selected" : "border-input bg-surface hover:bg-hover"
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", checked ? "text-primary" : "text-muted-foreground")} />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/**
 * "Create project" modal. Pass the element that opens it as `children`.
 * On success it navigates to the new project.
 */
export function CreateProjectDialog({ children }) {
  const navigate = useNavigate()
  const createProject = useCreateProject()
  const { data: members = [] } = useMembers()
  const { data: me } = useCurrentMember()
  const access = useWorkspaceAccess()
  const [open, setOpen] = useState(false)
  const [keyEdited, setKeyEdited] = useState(false)
  const [formError, setFormError] = useState(null)

  const form = useForm({
    resolver: zodResolver(projectFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      key: "",
      description: "",
      visibility: "workspace",
      status: "planning",
      phase: "planning",
      targetDate: "",
      leadId: "",
    },
  })
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = form
  const key = useWatch({ control, name: "key" })

  function handleOpenChange(next) {
    setOpen(next)
    if (next) {
      reset({
        name: "",
        key: "",
        description: "",
        visibility: "workspace",
        status: "planning",
        phase: "planning",
        targetDate: "",
        leadId: me?.id ?? "",
      })
      setKeyEdited(false)
      setFormError(null)
    }
  }

  async function onSubmit(values) {
    setFormError(null)
    try {
      const project = await createProject.mutateAsync({
        ...values,
        targetDate: values.targetDate || null,
      })
      setOpen(false)
      toast.success(`${project.name} created`)
      navigate(paths.project(project.id))
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(setError, fieldErrors, projectApiFieldMap)
      setFormError(message || unmatched.join(" ") || null)
    }
  }

  if (!access.isPending && !access.can(PERMS.projectsCreate)) {
    return <DisabledTrigger reason={restrictedReasons.createProject}>{children}</DisabledTrigger>
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>Projects group related issues, lifecycle phases, boards and people.</DialogDescription>
        </DialogHeader>

        <form id="create-project-form" className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && <Alert variant="danger">{formError}</Alert>}

          <FormField id="project-name" label="Name" error={errors.name?.message}>
            <Input
              autoComplete="off"
              placeholder="e.g. Customer portal"
              autoFocus
              {...register("name", {
                onChange: (event) => {
                  if (!keyEdited) setValue("key", suggestProjectKey(event.target.value), { shouldValidate: Boolean(errors.key) })
                },
              })}
            />
          </FormField>

          <FormField
            id="project-key"
            label="Key"
            error={errors.key?.message}
            hint={`Used in issue IDs, like ${key || "CP"}-12. Can't be changed later.`}
          >
            <Input
              autoComplete="off"
              maxLength={10}
              placeholder="e.g. CP"
              className="w-40 font-mono uppercase"
              {...register("key", {
                onChange: (event) => {
                  setKeyEdited(event.target.value !== "")
                  setValue("key", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                },
              })}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField id="project-phase" label="Initial Phase" error={errors.phase?.message}>
              <NativeSelect {...register("phase")}>
                {PROJECT_PHASES.map((ph) => (
                  <option key={ph.value} value={ph.value}>
                    {ph.step}. {ph.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>

            <FormField id="project-status" label="Initial Status" error={errors.status?.message}>
              <NativeSelect {...register("status")}>
                {PROJECT_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField id="project-target-date" label="Target Date" error={errors.targetDate?.message} hint="Optional deadline">
              <Input type="date" {...register("targetDate")} />
            </FormField>

            <FormField id="project-lead" label="Project lead" error={errors.leadId?.message}>
              {(controlProps) => (
                <Controller
                  control={control}
                  name="leadId"
                  render={({ field }) => (
                    <MemberSelect
                      {...controlProps}
                      label="Project lead"
                      noneLabel="Choose a lead"
                      allowNone={false}
                      value={field.value || null}
                      onChange={field.onChange}
                      members={members}
                    />
                  )}
                />
              )}
            </FormField>
          </div>

          <FormField id="project-description" label="Description" error={errors.description?.message} hint="Optional">
            <Textarea rows={3} maxLength={500} placeholder="What is this project about?" {...register("description")} />
          </FormField>

          <Controller
            control={control}
            name="visibility"
            render={({ field }) => <VisibilityField value={field.value} onChange={field.onChange} name="project-visibility" />}
          />
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="create-project-form" loading={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
