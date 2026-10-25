import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarRange, CircleCheckBig, Play } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { useCompleteSprint, useCreateSprint, useStartSprint, useUpdateSprint } from "@/api/hooks"
import { restrictedReasons } from "@/components/rbac/reasons"
import { DisabledTrigger } from "@/components/rbac/restricted"
import { useProjectGate } from "@/components/rbac/use-permission-gate"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { applyFieldErrors, parseApiError } from "@/lib/api-errors"
import { addDaysISO, formatDueDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { todayISO } from "@/models/issue"
import { PERMS } from "@/models/roles"
import { sprintApiFieldMap, sprintDaysLeft, sprintProgress, sprintStatusConfig, validateSprintDates } from "@/models/sprint"
import { sprintFormSchema, startSprintSchema } from "@/validation/sprint-schemas"

/** "Oct 7 – Oct 21" style label for a sprint's dates. */
export function SprintDates({ sprint, className }) {
  if (!sprint.startDate || !sprint.endDate) return <span className={cn("text-muted-foreground", className)}>No dates yet</span>
  const fmt = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })
  return (
    <span className={className}>
      {fmt(sprint.startDate)} – {fmt(sprint.endDate)}
    </span>
  )
}

export function SprintStatusBadge({ status }) {
  const config = sprintStatusConfig[status]
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}

/** Progress bar + completion statistics computed from the sprint's issues. */
export function SprintStats({ sprint, compact = false }) {
  const progress = sprintProgress(sprint)
  const daysLeft = sprint.status === "active" ? sprintDaysLeft(sprint) : null
  const { total, done, points, donePoints } = sprint.stats

  return (
    <div className="grid grid-cols-1 gap-2">
      <Progress value={progress} label={`${sprint.name} progress`} tone={sprint.status === "completed" ? "success" : "primary"} />
      <p className={cn("flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground", !compact && "text-[13px]")}>
        <span>
          <span className="font-medium text-foreground tabular-nums">{done}</span>/{total} issues done
        </span>
        {points > 0 && (
          <span>
            <span className="font-medium text-foreground tabular-nums">{donePoints}</span>/{points} points
          </span>
        )}
        {progress != null && <span className="tabular-nums">{progress}%</span>}
        {daysLeft != null && (
          <span className={cn(daysLeft < 0 && "font-medium text-danger-text")}>
            {daysLeft > 1 ? `${daysLeft} days left` : daysLeft === 1 ? "1 day left" : daysLeft === 0 ? "Ends today" : `${-daysLeft} days overdue`}
          </span>
        )}
      </p>
    </div>
  )
}

function DateFields({ register, errors, idPrefix }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField id={`${idPrefix}-start`} label="Start date" error={errors.startDate?.message}>
        <Input type="date" {...register("startDate", { setValueAs: (v) => v || null })} />
      </FormField>
      <FormField id={`${idPrefix}-end`} label="End date" error={errors.endDate?.message}>
        <Input type="date" {...register("endDate", { setValueAs: (v) => v || null })} />
      </FormField>
    </div>
  )
}

/** Applies the overlap rule locally for instant feedback (the server checks again). */
function checkOverlap(values, otherSprints, setError) {
  const errors = validateSprintDates(values, otherSprints)
  for (const [field, message] of Object.entries(errors)) setError(field, { type: "rule", message })
  return Object.keys(errors).length === 0
}

/**
 * Create or edit a sprint. Pass `sprint` to edit; `otherSprints` are the
 * project's other sprints, used to prevent overlapping dates.
 */
export function SprintFormDialog({ projectId, sprint, otherSprints = [], suggestedName = "", children }) {
  const gate = useProjectGate(projectId, PERMS.sprintsManage, restrictedReasons.sprints)
  const isEdit = Boolean(sprint)
  const create = useCreateSprint(projectId)
  const update = useUpdateSprint()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState(null)
  const defaults = () => ({
    name: sprint?.name ?? suggestedName,
    goal: sprint?.goal ?? "",
    startDate: sprint?.startDate ?? null,
    endDate: sprint?.endDate ?? null,
  })
  const { register, handleSubmit, setError, reset, formState } = useForm({
    resolver: zodResolver(sprintFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: defaults(),
  })
  const { errors, isSubmitting } = formState

  async function onSubmit(values) {
    setFormError(null)
    if (!checkOverlap(values, otherSprints, setError)) return
    if (sprint?.status === "active" && (!values.startDate || !values.endDate)) {
      setError("endDate", { type: "rule", message: "An active sprint needs both dates." })
      return
    }
    try {
      const saved = isEdit ? await update.mutateAsync({ id: sprint.id, ...values }) : await create.mutateAsync(values)
      setOpen(false)
      toast.success(isEdit ? `${saved.name} updated` : `${saved.name} created`)
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(setError, fieldErrors, sprintApiFieldMap)
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
          reset(defaults())
          setFormError(null)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${sprint.name}` : "Create sprint"}</DialogTitle>
          <DialogDescription>Sprints are short, time-boxed iterations. Dates can't overlap another open sprint in this project.</DialogDescription>
        </DialogHeader>
        <form id="sprint-form" className="grid grid-cols-1 gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && <Alert variant="danger">{formError}</Alert>}
          <FormField id="sprint-name" label="Name" error={errors.name?.message}>
            <Input autoComplete="off" autoFocus {...register("name")} />
          </FormField>
          <FormField id="sprint-goal" label="Sprint goal" error={errors.goal?.message} hint="Optional. What should this sprint achieve?">
            <Textarea rows={2} {...register("goal")} />
          </FormField>
          <DateFields register={register} errors={errors} idPrefix="sprint" />
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="sprint-form" loading={isSubmitting}>
            {isEdit ? "Save changes" : "Create sprint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Start a planned sprint. One active sprint per project; it needs issues and dates. */
export function StartSprintDialog({ sprint, otherSprints = [], activeSprint, children }) {
  const gate = useProjectGate(sprint.projectId, PERMS.sprintsManage, restrictedReasons.sprints)
  const start = useStartSprint()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState(null)
  const today = todayISO()
  const defaults = () => ({
    goal: sprint.goal ?? "",
    startDate: sprint.startDate && sprint.startDate >= today ? sprint.startDate : today,
    endDate: sprint.endDate && sprint.endDate > today ? sprint.endDate : addDaysISO(14),
  })
  const { register, handleSubmit, setError, reset, formState } = useForm({
    resolver: zodResolver(startSprintSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: defaults(),
  })
  const blocked = activeSprint
    ? `${activeSprint.name} is still active. Complete it before starting another sprint.`
    : sprint.stats.total === 0
      ? "Add at least one issue to this sprint before starting it."
      : null

  async function onSubmit(values) {
    setFormError(null)
    if (!checkOverlap(values, otherSprints, setError)) return
    try {
      await start.mutateAsync({ id: sprint.id, ...values })
      setOpen(false)
      toast.success(`${sprint.name} started`)
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      const unmatched = applyFieldErrors(setError, fieldErrors, sprintApiFieldMap)
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
          reset(defaults())
          setFormError(null)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start {sprint.name}</DialogTitle>
          <DialogDescription>
            {sprint.stats.total} {sprint.stats.total === 1 ? "issue" : "issues"} · {sprint.stats.points} story points
          </DialogDescription>
        </DialogHeader>
        {blocked ? (
          <Alert variant="warning">{blocked}</Alert>
        ) : (
          <form id="start-sprint-form" className="grid grid-cols-1 gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {formError && <Alert variant="danger">{formError}</Alert>}
            <DateFields register={register} errors={formState.errors} idPrefix="start-sprint" />
            <FormField id="start-sprint-goal" label="Sprint goal" error={formState.errors.goal?.message}>
              <Textarea rows={2} {...register("goal")} />
            </FormField>
          </form>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          {!blocked && (
            <Button type="submit" form="start-sprint-form" loading={formState.isSubmitting}>
              <Play />
              Start sprint
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Complete the active sprint and choose where unfinished issues go. */
export function CompleteSprintDialog({ sprint, plannedSprints = [], children }) {
  const gate = useProjectGate(sprint.projectId, PERMS.sprintsManage, restrictedReasons.sprints)
  const complete = useCompleteSprint()
  const [open, setOpen] = useState(false)
  const [destination, setDestination] = useState("")
  const [formError, setFormError] = useState(null)
  const open_ = sprint.stats.total - sprint.stats.done

  async function submit() {
    setFormError(null)
    try {
      await complete.mutateAsync({ id: sprint.id, moveOpenIssuesTo: destination || null })
      setOpen(false)
      toast.success(`${sprint.name} completed`, {
        description: `${sprint.stats.done} done${open_ > 0 ? `, ${open_} moved to ${plannedSprints.find((s) => s.id === destination)?.name ?? "the backlog"}` : ""}.`,
      })
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      setFormError(fieldErrors.move_open_issues_to ?? message)
    }
  }

  if (gate) return <DisabledTrigger reason={gate}>{children}</DisabledTrigger>

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setDestination(plannedSprints[0]?.id ?? "")
          setFormError(null)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete {sprint.name}</DialogTitle>
          <DialogDescription>
            <SprintDates sprint={sprint} />
            {sprint.endDate && ` · ended ${formatDueDate(sprint.endDate).toLowerCase()}`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4">
          {formError && <Alert variant="danger">{formError}</Alert>}
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-success/5 p-3">
              <dt className="flex items-center gap-1.5 text-xs text-success-text">
                <CircleCheckBig aria-hidden="true" className="size-3.5" />
                Completed
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{sprint.stats.done}</dd>
            </div>
            <div className="rounded-lg border bg-surface p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarRange aria-hidden="true" className="size-3.5" />
                Not finished
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{open_}</dd>
            </div>
          </dl>
          {open_ > 0 ? (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">Move unfinished issues to</legend>
              {[{ id: "", name: "Backlog" }, ...plannedSprints].map((option) => (
                <label
                  key={option.id || "backlog"}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm has-focus-visible:ring-[3px] has-focus-visible:ring-ring/70",
                    destination === option.id ? "border-primary bg-selected" : "border-input bg-surface hover:bg-hover"
                  )}
                >
                  <input
                    type="radio"
                    name="complete-destination"
                    value={option.id}
                    checked={destination === option.id}
                    onChange={() => setDestination(option.id)}
                    className="size-4 accent-primary"
                  />
                  {option.name}
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-sm text-muted-foreground">Every issue in this sprint is done.</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} loading={complete.isPending}>
            Complete sprint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
