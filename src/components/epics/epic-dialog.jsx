import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { useCreateIssue, useMembers, useUpdateIssue } from "@/api/hooks"
import { DueDatePicker, MemberSelect, PrioritySelect, StatusSelect } from "@/components/issues/issue-fields"
import { restrictedReasons } from "@/components/rbac/reasons"
import { DisabledTrigger } from "@/components/rbac/restricted"
import { useProjectGate } from "@/components/rbac/use-permission-gate"
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
import { Textarea } from "@/components/ui/textarea"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { issueApiFieldMap } from "@/models/issue"
import { PERMS } from "@/models/roles"
import { epicFormSchema } from "@/validation/sprint-schemas"

const emptyEpic = { title: "", description: "", status: "todo", priority: "medium", assigneeId: null, dueDate: null }

/** Create an epic, or edit one when `epic` is given. Epics are issues of type "epic". */
export function EpicDialog({ projectId, epic, children }) {
  const gate = useProjectGate(projectId, PERMS.issuesWrite, restrictedReasons.writeIssues)
  const isEdit = Boolean(epic)
  const createIssue = useCreateIssue()
  const updateIssue = useUpdateIssue(epic?.key)
  const { data: members = [] } = useMembers()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState(null)
  const values = () =>
    epic
      ? { title: epic.title, description: epic.description, status: epic.status, priority: epic.priority, assigneeId: epic.assigneeId, dueDate: epic.dueDate }
      : emptyEpic
  const { register, control, handleSubmit, setError, reset, formState } = useForm({
    resolver: zodResolver(epicFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: values(),
  })
  const { errors, isSubmitting } = formState

  async function onSubmit(data) {
    setFormError(null)
    try {
      const saved = isEdit
        ? await updateIssue.mutateAsync(data)
        : await createIssue.mutateAsync({ ...data, projectId, type: "epic", labels: [], storyPoints: null, parentId: null, sprintId: null })
      setOpen(false)
      toast.success(isEdit ? `${saved.key} updated` : `${saved.key} created`)
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(setError, fieldErrors, issueApiFieldMap)
      setFormError(message || unmatched.join(" ") || null)
    }
  }

  if (gate) return <DisabledTrigger reason={gate}>{children}</DisabledTrigger>

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          reset(values())
          setFormError(null)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${epic.key}` : "Create epic"}</DialogTitle>
          <DialogDescription>Epics group related stories, tasks and bugs into a larger goal.</DialogDescription>
        </DialogHeader>
        <form id="epic-form" className="grid grid-cols-1 gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && <Alert variant="danger">{formError}</Alert>}
          <FormField id="epic-title" label="Name" error={errors.title?.message}>
            <Input autoComplete="off" autoFocus placeholder="e.g. Self-serve onboarding" {...register("title")} />
          </FormField>
          <FormField id="epic-description" label="Description" error={errors.description?.message}>
            <Textarea rows={3} placeholder="What outcome does this epic deliver?" {...register("description")} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="epic-status" label="Status">
              {(p) => <Controller control={control} name="status" render={({ field }) => <StatusSelect {...p} value={field.value} onChange={field.onChange} />} />}
            </FormField>
            <FormField id="epic-priority" label="Priority">
              {(p) => <Controller control={control} name="priority" render={({ field }) => <PrioritySelect {...p} value={field.value} onChange={field.onChange} />} />}
            </FormField>
            <FormField id="epic-owner" label="Owner">
              {(p) => (
                <Controller
                  control={control}
                  name="assigneeId"
                  render={({ field }) => <MemberSelect {...p} label="Owner" noneLabel="No owner" value={field.value} onChange={field.onChange} members={members} />}
                />
              )}
            </FormField>
            <FormField id="epic-due" label="Target date">
              {(p) => <Controller control={control} name="dueDate" render={({ field }) => <DueDatePicker {...p} value={field.value} onChange={field.onChange} />} />}
            </FormField>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="epic-form" loading={isSubmitting}>
            {isEdit ? "Save changes" : "Create epic"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
