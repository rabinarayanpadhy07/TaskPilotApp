import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Edit3 } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { useMembers, useUpdateProject } from "@/api/hooks"
import { MemberSelect } from "@/components/issues/issue-fields"
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
import { PROJECT_PHASES, PROJECT_STATUSES, projectApiFieldMap } from "@/models/project"
import { projectEditSchema } from "@/validation/issue-schemas"

export function EditProjectDialog({ project, children }) {
  const updateProject = useUpdateProject(project.id)
  const { data: members = [] } = useMembers()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState(null)

  const form = useForm({
    resolver: zodResolver(projectEditSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
      status: project.status ?? "planning",
      phase: project.phase ?? "planning",
      targetDate: project.targetDate ?? "",
      leadId: project.leadId ?? "",
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

  function handleOpenChange(next) {
    setOpen(next)
    if (next) {
      reset({
        name: project.name,
        description: project.description ?? "",
        status: project.status ?? "planning",
        phase: project.phase ?? "planning",
        targetDate: project.targetDate ?? "",
        leadId: project.leadId ?? "",
      })
      setFormError(null)
    }
  }

  async function onSubmit(values) {
    setFormError(null)
    try {
      await updateProject.mutateAsync({
        name: values.name,
        description: values.description,
        status: values.status,
        phase: values.phase,
        targetDate: values.targetDate || null,
        leadId: values.leadId || null,
      })
      setOpen(false)
      toast.success(`${values.name} updated successfully`)
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(setError, fieldErrors, projectApiFieldMap)
      setFormError(message || unmatched.join(" ") || "Failed to update project.")
    }
  }

  async function handleMarkCompleted() {
    setValue("status", "completed")
    setValue("phase", "completed")
    await handleSubmit(onSubmit)()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="secondary" size="sm" className="gap-1.5">
            <Edit3 className="size-3.5" />
            Edit project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit project details</DialogTitle>
          <DialogDescription>
            Update status, lifecycle phase, target dates and information for <strong className="font-semibold text-foreground">{project.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form id="edit-project-form" className="grid gap-4 py-1" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && <Alert variant="danger">{formError}</Alert>}

          <FormField id="edit-project-name" label="Project Name" error={errors.name?.message}>
            <Input autoComplete="off" placeholder="e.g. Customer portal" {...register("name")} />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField id="edit-project-status" label="Health Status" error={errors.status?.message}>
              <NativeSelect {...register("status")}>
                {PROJECT_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label} ({st.description})
                  </option>
                ))}
              </NativeSelect>
            </FormField>

            <FormField id="edit-project-phase" label="Lifecycle Phase" error={errors.phase?.message}>
              <NativeSelect {...register("phase")}>
                {PROJECT_PHASES.map((ph) => (
                  <option key={ph.value} value={ph.value}>
                    {ph.step}. {ph.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField id="edit-project-target-date" label="Target Completion Date" error={errors.targetDate?.message} hint="Optional deadline">
              <Input type="date" {...register("targetDate")} />
            </FormField>

            <FormField id="edit-project-lead" label="Project Lead" error={errors.leadId?.message}>
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

          <FormField id="edit-project-description" label="Description" error={errors.description?.message} hint="Optional">
            <Textarea rows={3} maxLength={500} placeholder="What is this project about?" {...register("description")} />
          </FormField>
        </form>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
          {project.status !== "completed" && project.phase !== "completed" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
              onClick={handleMarkCompleted}
              loading={isSubmitting}
            >
              <CheckCircle2 className="size-4" />
              Mark as Completed
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Project is marked Completed</span>
          )}

          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="edit-project-form" loading={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
