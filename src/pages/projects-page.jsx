import { CheckCircle2, Clock, FolderKanban, Layers, Plus, SearchX, Sparkles } from "lucide-react"

import { useMembers, useProjects } from "@/api/hooks"
import { FilterMenu, SearchFilter, SortMenu, ViewToggle } from "@/components/filters"
import { PageHeader } from "@/components/page-header"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ProjectGrid, ProjectListView } from "@/components/projects/project-card"
import { ProjectPhaseBadge, ProjectStatusBadge } from "@/components/projects/project-tile"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { QueryError } from "@/components/ui/query-error"
import { UserAvatar } from "@/components/user-avatar"
import { useUrlFilters } from "@/lib/use-url-filters"
import { cn } from "@/lib/utils"
import { PROJECT_PHASES, PROJECT_STATUSES, projectProgress } from "@/models/project"
import { useUIStore } from "@/stores/ui-store"

const filterDefaults = { q: "", status: [], phase: [], lead: [], sort: "updated", tab: "all" }

const sortOptions = [
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name" },
  { value: "progress", label: "Progress" },
  { value: "open", label: "Open issues" },
]

const sorters = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  name: (a, b) => a.name.localeCompare(b.name),
  progress: (a, b) => (projectProgress(b) ?? -1) - (projectProgress(a) ?? -1),
  open: (a, b) => b.issueCounts.open - a.issueCounts.open,
}

function NewProjectButton() {
  return (
    <CreateProjectDialog>
      <Button>
        <Plus />
        New project
      </Button>
    </CreateProjectDialog>
  )
}

export function ProjectsPage() {
  const { data: projects = [], isPending, error, refetch, isFetching } = useProjects()
  const { data: members = [] } = useMembers()
  const view = useUIStore((state) => state.projectsView)
  const setView = useUIStore((state) => state.setProjectsView)
  const { values, set, clear } = useUrlFilters(filterDefaults)

  // KPI counts
  const totalCount = projects.length
  const completedCount = projects.filter((p) => p.status === "completed" || p.phase === "completed").length
  const planningCount = projects.filter((p) => (p.status === "planning" || p.phase === "planning") && p.status !== "completed").length
  const activeCount = projects.filter((p) => p.status !== "completed" && p.phase !== "completed" && (p.phase !== "planning" || p.status !== "planning")).length

  const query = values.q.trim().toLowerCase()
  const visible = projects
    .filter(
      (project) =>
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.key.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query)
    )
    .filter((project) => {
      if (values.tab === "active") return project.status !== "completed" && project.phase !== "completed" && (project.phase !== "planning" || project.status !== "planning")
      if (values.tab === "planning") return (project.status === "planning" || project.phase === "planning") && project.status !== "completed"
      if (values.tab === "completed") return project.status === "completed" || project.phase === "completed"
      return true
    })
    .filter((project) => values.status.length === 0 || values.status.includes(project.status))
    .filter((project) => values.phase.length === 0 || values.phase.includes(project.phase))
    .filter((project) => values.lead.length === 0 || values.lead.includes(project.leadId))
    .sort(sorters[values.sort] ?? sorters.updated)

  const filtersActive = Boolean(query) || values.status.length > 0 || values.phase.length > 0 || values.lead.length > 0 || values.tab !== "all"
  const leadOptions = members.filter((m) => projects.some((p) => p.leadId === m.id)).map((m) => ({ value: m.id, label: m.name }))
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        description="Plan, track lifecycle phases, and ship projects with ease."
        actions={projects.length > 0 && <NewProjectButton />}
      />

      {error ? (
        <QueryError error={error} title="Couldn't load projects" onRetry={refetch} retrying={isFetching} />
      ) : !isPending && projects.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={FolderKanban}
          title="No projects yet"
          description="Projects group related issues, lifecycle phases and people. Create one to get started."
          action={<NewProjectButton />}
        />
      ) : (
        <>
          {/* Quick KPI Overview Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => set("tab", "all")}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all hover:border-input cursor-pointer",
                values.tab === "all" ? "border-primary bg-selected ring-1 ring-primary/30" : "bg-card shadow-xs"
              )}
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">All Projects</span>
                <Layers className="size-4" />
              </div>
              <span className="text-2xl font-bold tabular-nums text-foreground">{totalCount}</span>
              <span className="text-[11px] text-muted-foreground">Total workspace projects</span>
            </button>

            <button
              type="button"
              onClick={() => set("tab", "active")}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all hover:border-input cursor-pointer",
                values.tab === "active" ? "border-primary bg-selected ring-1 ring-primary/30" : "bg-card shadow-xs"
              )}
            >
              <div className="flex items-center justify-between text-primary">
                <span className="text-xs font-medium">In Progress</span>
                <Sparkles className="size-4" />
              </div>
              <span className="text-2xl font-bold tabular-nums text-foreground">{activeCount}</span>
              <span className="text-[11px] text-muted-foreground">Active development & testing</span>
            </button>

            <button
              type="button"
              onClick={() => set("tab", "planning")}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all hover:border-input cursor-pointer",
                values.tab === "planning" ? "border-primary bg-selected ring-1 ring-primary/30" : "bg-card shadow-xs"
              )}
            >
              <div className="flex items-center justify-between text-amber-500">
                <span className="text-xs font-medium">In Planning</span>
                <Clock className="size-4" />
              </div>
              <span className="text-2xl font-bold tabular-nums text-foreground">{planningCount}</span>
              <span className="text-[11px] text-muted-foreground">Scoping & requirements</span>
            </button>

            <button
              type="button"
              onClick={() => set("tab", "completed")}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all hover:border-input cursor-pointer",
                values.tab === "completed" ? "border-primary bg-selected ring-1 ring-primary/30" : "bg-card shadow-xs"
              )}
            >
              <div className="flex items-center justify-between text-emerald-500">
                <span className="text-xs font-medium">Completed</span>
                <CheckCircle2 className="size-4" />
              </div>
              <span className="text-2xl font-bold tabular-nums text-foreground">{completedCount}</span>
              <span className="text-[11px] text-muted-foreground">Delivered & shipped</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <SearchFilter value={values.q} onChange={(q) => set("q", q)} placeholder="Search projects…" label="Search projects" />
            
            <FilterMenu
              label="Phase"
              options={PROJECT_PHASES}
              value={values.phase}
              onChange={(v) => set("phase", v)}
              renderOption={(option) => <ProjectPhaseBadge phase={option.value} />}
            />

            <FilterMenu
              label="Health"
              options={PROJECT_STATUSES}
              value={values.status}
              onChange={(v) => set("status", v)}
              renderOption={(option) => <ProjectStatusBadge status={option.value} />}
            />

            <FilterMenu
              label="Lead"
              options={leadOptions}
              value={values.lead}
              onChange={(v) => set("lead", v)}
              renderOption={(option) => (
                <span className="flex items-center gap-2">
                  <UserAvatar name={memberById[option.value]?.name ?? option.label} size="sm" />
                  {option.label}
                </span>
              )}
            />

            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  set("q", "")
                  set("status", [])
                  set("phase", [])
                  set("lead", [])
                  set("tab", "all")
                }}
              >
                Clear filters
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <SortMenu value={values.sort} onChange={(sort) => set("sort", sort === "updated" ? "" : sort)} options={sortOptions} />
              <ViewToggle value={view} onChange={setView} />
            </div>
          </div>

          <p className="sr-only" role="status">
            {isPending ? "Loading projects" : `${visible.length} of ${projects.length} projects shown`}
          </p>

          {!isPending && visible.length === 0 ? (
            <EmptyState
              variant="bordered"
              icon={SearchX}
              title="No projects match your filters"
              description="Try a different search or clear the filters to see all projects."
              action={
                <Button variant="secondary" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          ) : view === "list" ? (
            <ProjectListView projects={visible} isPending={isPending} />
          ) : (
            <ProjectGrid projects={visible} isPending={isPending} />
          )}
        </>
      )}
    </div>
  )
}
