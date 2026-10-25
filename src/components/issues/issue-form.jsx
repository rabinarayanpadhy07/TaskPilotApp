import { useState } from "react"
import { Controller, useWatch } from "react-hook-form"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { useCreateIssue, useIssues, useLabels, useMembers, useProjects, useSprints } from "@/api/hooks"
import {
  DueDatePicker,
  IssueTypeSelect,
  LabelsSelect,
  MemberSelect,
  ParentSelect,
  PrioritySelect,
  StatusSelect,
  StoryPointsSelect,
} from "@/components/issues/issue-fields"
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
import { emptyIssueValues, useIssueForm } from "@/components/issues/use-issue-form"
import { DisabledTrigger } from "@/components/rbac/restricted"
import { useCreateIssueGate } from "@/components/rbac/use-permission-gate"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { paths } from "@/lib/routes"
import { allowedParentTypes, issueApiFieldMap, isPlannable } from "@/models/issue"
import { projectCan } from "@/models/project"
import { PERMS } from "@/models/roles"


/**
 * All issue fields with validation. Rendered without buttons so the host
 * (dialog, page) places its own actions and submits via `form={id}`.
 *
 * @param {object} props
 * @param {string} props.id                 form element id
 * @param {object} props.form               result of useIssueForm() (./use-issue-form.js)
 * @param {(values) => void} props.onSubmit
 * @param {string|null} [props.formError]
 */
export function IssueForm({ id, form, onSubmit, formError }) {
  const { data: allProjects = [] } = useProjects()
  // Read-only projects aren't offered; the API would reject them anyway
  const projects = allProjects.filter((project) => projectCan(project, PERMS.issuesWrite))
  const { data: members = [] } = useMembers()
  const { data: labelOptions = [] } = useLabels()
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form

  const [projectId, type, parentId] = useWatch({ control, name: ["projectId", "type", "parentId"] })
  const { data: projectIssues = [] } = useIssues({ projectId: projectId || undefined }, { enabled: Boolean(projectId) })
  const parentCandidates = projectIssues.filter((issue) => allowedParentTypes(type).includes(issue.type))
  const { data: sprints = [] } = useSprints(projectId || undefined)
  const openSprints = sprints.filter((sprint) => sprint.status !== "completed")
  const showSprint = isPlannable({ type }) && openSprints.length > 0
  const parentTypes = allowedParentTypes(type)

  function changeType(nextType) {
    setValue("type", nextType, { shouldDirty: true })
    const parent = projectIssues.find((issue) => issue.id === parentId)
    if (parent && !allowedParentTypes(nextType).includes(parent.type)) setValue("parentId", null)
    if (nextType === "epic") setValue("parentId", null)
    if (!isPlannable({ type: nextType })) setValue("sprintId", null)
  }

  return (
    <form id={id} className="grid grid-cols-1 gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id={`${id}-project`} label="Project" error={errors.projectId?.message}>
          {(controlProps) => (
            // Controlled so a preselected project shows even if the list loads after opening
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <NativeSelect
                  {...controlProps}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    field.onChange(event.target.value)
                    setValue("parentId", null)
                    setValue("sprintId", null)
                  }}
                  disabled={projects.length === 0}
                >
                  <option value="">{projects.length === 0 ? "Loading projects…" : "Choose a project…"}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.key})
                    </option>
                  ))}
                </NativeSelect>
              )}
            />
          )}
        </FormField>
        <FormField id={`${id}-type`} label="Issue type" error={errors.type?.message}>
          {(controlProps) => <IssueTypeSelect {...controlProps} value={type} onChange={changeType} />}
        </FormField>
      </div>

      <FormField id={`${id}-title`} label="Title" error={errors.title?.message}>
        <Input autoComplete="off" placeholder="What needs to be done?" autoFocus {...register("title")} />
      </FormField>

      <FormField id={`${id}-description`} label="Description" error={errors.description?.message}>
        <Textarea rows={4} placeholder="Add context, acceptance criteria or steps to reproduce…" className="max-h-60" {...register("description")} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id={`${id}-status`} label="Status">
          {(controlProps) => (
            <Controller control={control} name="status" render={({ field }) => <StatusSelect {...controlProps} value={field.value} onChange={field.onChange} />} />
          )}
        </FormField>
        <FormField id={`${id}-priority`} label="Priority">
          {(controlProps) => (
            <Controller control={control} name="priority" render={({ field }) => <PrioritySelect {...controlProps} value={field.value} onChange={field.onChange} />} />
          )}
        </FormField>
        <FormField id={`${id}-assignee`} label="Assignee">
          {(controlProps) => (
            <Controller
            control={control}
            name="assigneeId"
            render={({ field }) => <MemberSelect {...controlProps} value={field.value} onChange={field.onChange} members={members} />}
          />
          )}
        </FormField>
        <FormField id={`${id}-due`} label="Due date">
          {(controlProps) => (
            <Controller control={control} name="dueDate" render={({ field }) => <DueDatePicker {...controlProps} value={field.value} onChange={field.onChange} />} />
          )}
        </FormField>
        <FormField id={`${id}-labels`} label="Labels" error={errors.labels?.message}>
          {(controlProps) => (
            <Controller
            control={control}
            name="labels"
            render={({ field }) => <LabelsSelect {...controlProps} value={field.value} onChange={field.onChange} options={labelOptions} className="h-auto min-h-9 py-1.5" />}
          />
          )}
        </FormField>
        <FormField id={`${id}-points`} label="Story points">
          {(controlProps) => (
            <Controller control={control} name="storyPoints" render={({ field }) => <StoryPointsSelect {...controlProps} value={field.value} onChange={field.onChange} />} />
          )}
        </FormField>
      </div>

      {showSprint && (
        <FormField id={`${id}-sprint`} label="Sprint" hint="Leave empty to keep it in the backlog.">
          {(controlProps) => (
            <Controller
              control={control}
              name="sprintId"
              render={({ field }) => (
                <NativeSelect
                  {...controlProps}
                  name={field.name}
                  ref={field.ref}
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={(event) => field.onChange(event.target.value || null)}
                >
                  <option value="">Backlog (no sprint)</option>
                  {openSprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                      {sprint.status === "active" ? " (active)" : ""}
                    </option>
                  ))}
                </NativeSelect>
              )}
            />
          )}
        </FormField>
      )}

      {parentTypes.length > 0 && (
        <FormField
          id={`${id}-parent`}
          label={type === "subtask" ? "Parent issue" : "Epic"}
          error={errors.parentId?.message}
          hint={
            !projectId
              ? "Choose a project first."
              : type === "subtask"
                ? "Subtasks belong to a story, task or bug."
                : "Optional: group this issue under an epic."
          }
        >
          {(controlProps) => (
          <Controller
            control={control}
            name="parentId"
            render={({ field }) => (
              <ParentSelect
                {...controlProps}
                value={field.value}
                onChange={field.onChange}
                candidates={parentCandidates}
                allowNone={type !== "subtask"}
                disabled={!projectId}
                emptyText={type === "subtask" ? "No stories, tasks or bugs in this project yet." : "No epics in this project yet."}
              />
            )}
          />
          )}
        </FormField>
      )}
    </form>
  )
}


/**
 * "Create issue" dialog. Pass the element that opens it as `children`, and
 * `defaults` to prefill (e.g. the current project, or a parent for subtasks).
 */
export function CreateIssueDialog({ children, defaults }) {
  const gate = useCreateIssueGate(defaults?.projectId)
  const navigate = useNavigate()
  const createIssue = useCreateIssue()
  const [open, setOpen] = useState(false)
  const [createAnother, setCreateAnother] = useState(false)
  const [formError, setFormError] = useState(null)
  const form = useIssueForm({ assigneeId: null, ...defaults })

  function handleOpenChange(next) {
    setOpen(next)
    if (next) {
      form.reset({ ...emptyIssueValues, ...defaults })
      setFormError(null)
    }
  }

  async function onSubmit(values) {
    setFormError(null)
    try {
      const issue = await createIssue.mutateAsync(values)
      toast.success(`${issue.key} created`, {
        description: issue.title,
        action: { label: "View", onClick: () => navigate(paths.issue(issue)) },
      })
      if (createAnother) {
        form.reset({ ...values, title: "", description: "" })
        form.setFocus("title")
      } else {
        setOpen(false)
      }
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(form.setError, fieldErrors, issueApiFieldMap)
      setFormError(message || unmatched.join(" ") || null)
    }
  }

  if (gate) return <DisabledTrigger reason={gate}>{children}</DisabledTrigger>

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create issue</DialogTitle>
          <DialogDescription>
            Add an epic, story, task, bug or subtask. You'll be the reporter.
          </DialogDescription>
        </DialogHeader>

        <IssueForm id="create-issue-form" form={form} onSubmit={onSubmit} formError={formError} />

        <DialogFooter className="items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={createAnother}
              onChange={(event) => setCreateAnother(event.target.checked)}
              className="size-4 cursor-pointer accent-primary"
            />
            Create another
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="create-issue-form" loading={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating…" : "Create issue"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
