import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flag,
  PartyPopper,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"

import { useUpdateProject } from "@/api/hooks"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { PROJECT_PHASES, PROJECT_STATUSES, projectCan } from "@/models/project"
import { PERMS } from "@/models/roles"

export function ProjectPhaseStepper({ project }) {
  const updateProject = useUpdateProject(project.id)
  const canManage = projectCan(project, PERMS.projectUpdate)

  const currentPhaseIndex = PROJECT_PHASES.findIndex((p) => p.value === project.phase)
  const activePhase = PROJECT_PHASES[currentPhaseIndex >= 0 ? currentPhaseIndex : 0]
  const nextPhase = currentPhaseIndex >= 0 && currentPhaseIndex < PROJECT_PHASES.length - 1 ? PROJECT_PHASES[currentPhaseIndex + 1] : null
  const isCompleted = project.status === "completed" || project.phase === "completed"

  async function handleSetPhase(phaseValue) {
    if (!canManage || updateProject.isPending) return
    const isTargetCompleted = phaseValue === "completed"
    try {
      await updateProject.mutateAsync({
        phase: phaseValue,
        status: isTargetCompleted ? "completed" : project.status === "completed" ? "on_track" : project.status,
      })
      const targetPhase = PROJECT_PHASES.find((p) => p.value === phaseValue)
      toast.success(isTargetCompleted ? `🎉 ${project.name} marked as Completed!` : `Phase updated to ${targetPhase?.label}`)
    } catch {
      toast.error("Failed to update project phase")
    }
  }

  async function handleSetStatus(statusValue) {
    if (!canManage || updateProject.isPending) return
    try {
      await updateProject.mutateAsync({
        status: statusValue,
        phase: statusValue === "completed" ? "completed" : project.phase,
      })
      const targetStatus = PROJECT_STATUSES.find((s) => s.value === statusValue)
      toast.success(`Project status set to ${targetStatus?.label}`)
    } catch {
      toast.error("Failed to update project status")
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs">
      {/* Header with Title and Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flag className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-base font-semibold text-foreground">Project Lifecycle & Phase</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Current Phase: <strong className="font-semibold text-foreground">{activePhase.label}</strong> · {activePhase.description}
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-xs">
                  <span>Status:</span>
                  <span className="font-semibold">{PROJECT_STATUSES.find((s) => s.value === project.status)?.label ?? project.status}</span>
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Project Health</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PROJECT_STATUSES.map((st) => (
                  <DropdownMenuItem
                    key={st.value}
                    onClick={() => handleSetStatus(st.value)}
                    className="flex items-center justify-between text-xs"
                  >
                    <span>{st.label}</span>
                    {project.status === st.value && <Check className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Phase Advance or Completed Toggle */}
            {isCompleted ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleSetPhase("development")}
                loading={updateProject.isPending}
              >
                <RotateCcw className="size-3.5" />
                Reopen project
              </Button>
            ) : nextPhase ? (
              <Button
                variant="primary"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => handleSetPhase(nextPhase.value)}
                loading={updateProject.isPending}
              >
                Advance to {nextPhase.label}
                <ArrowRight className="size-3.5" />
              </Button>
            ) : null}

            {!isCompleted && (
              <Button
                variant="success"
                size="sm"
                className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                onClick={() => handleSetPhase("completed")}
                loading={updateProject.isPending}
              >
                <CheckCircle2 className="size-3.5" />
                Mark Completed
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Celebratory Completed Banner */}
      {isCompleted && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          <PartyPopper className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <p className="font-medium">Project Completed & Shipped!</p>
            <p className="text-xs opacity-90">All project phases have been successfully achieved and delivered.</p>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Completed
          </span>
        </div>
      )}

      {/* Visual Phase Pipeline Stepper */}
      <nav aria-label="Project phases" className="mt-2 pt-2">
        <ol className="grid grid-cols-5 gap-2 sm:gap-4">
          {PROJECT_PHASES.map((phase, idx) => {
            const isPassed = idx < currentPhaseIndex || isCompleted
            const isCurrent = phase.value === project.phase && !isCompleted
            const isClickable = canManage && !updateProject.isPending

            return (
              <li key={phase.value} className="relative flex flex-col items-center">
                {/* Connecting Line between steps */}
                {idx > 0 && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute top-4 -left-1/2 w-full h-0.5 -translate-y-1/2 transition-colors",
                      isPassed || (isCurrent && idx <= currentPhaseIndex) ? "bg-primary" : "bg-border"
                    )}
                  />
                )}

                {/* Step Circle / Button */}
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => handleSetPhase(phase.value)}
                  className={cn(
                    "relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20 scale-110"
                      : isPassed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground hover:border-input",
                    isClickable ? "cursor-pointer hover:scale-105" : "cursor-default"
                  )}
                  title={canManage ? `Click to switch to ${phase.label} phase` : phase.label}
                >
                  {isPassed ? <Check className="size-4 stroke-[2.5]" /> : phase.step}
                </button>

                {/* Step Label & Subtitle */}
                <div className="mt-2 text-center">
                  <span
                    className={cn(
                      "block text-xs font-medium transition-colors",
                      isCurrent ? "font-bold text-primary" : isPassed ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {phase.label}
                  </span>
                  <span className="hidden sm:block text-[10px] text-muted-foreground line-clamp-1 max-w-[90px] mx-auto">
                    {phase.value === "completed" ? "Ship & Sign-off" : phase.value}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Footer Info: Target Date & Quick Status Bar */}
      {project.targetDate && (
        <div className="mt-1 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>Target Completion: <strong>{formatDate(project.targetDate)}</strong></span>
          </div>
          <div>
            <span>Project Health: <strong className="text-foreground capitalize">{project.status.replace("_", " ")}</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}
