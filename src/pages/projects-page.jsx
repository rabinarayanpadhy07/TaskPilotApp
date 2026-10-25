import { FolderKanban, Plus, SearchX } from "lucide-react"

import { useMembers, useProjects } from "@/api/hooks"
import { FilterMenu, SearchFilter, SortMenu, ViewToggle } from "@/components/filters"
import { PageHeader } from "@/components/page-header"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ProjectGrid, ProjectListView } from "@/components/projects/project-card"
import { ProjectStatusBadge } from "@/components/projects/project-tile"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { QueryError } from "@/components/ui/query-error"
import { UserAvatar } from "@/components/user-avatar"
import { useUrlFilters } from "@/lib/use-url-filters"
import { PROJECT_STATUSES, projectProgress } from "@/models/project"
import { useUIStore } from "@/stores/ui-store"

const filterDefaults = { q: "", status: [], lead: [], sort: "updated" }

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

  const query = values.q.trim().toLowerCase()
  const visible = projects
    .filter(
      (project) =>
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.key.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query)
    )
    .filter((project) => values.status.length === 0 || values.status.includes(project.status))
    .filter((project) => values.lead.length === 0 || values.lead.includes(project.leadId))
    .sort(sorters[values.sort] ?? sorters.updated)

  const filtersActive = Boolean(query) || values.status.length > 0 || values.lead.length > 0
  const leadOptions = members.filter((m) => projects.some((p) => p.leadId === m.id)).map((m) => ({ value: m.id, label: m.name }))
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        description="Plan, track and ship work with your team."
        actions={projects.length > 0 && <NewProjectButton />}
      />

      {error ? (
        <QueryError error={error} title="Couldn't load projects" onRetry={refetch} retrying={isFetching} />
      ) : !isPending && projects.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={FolderKanban}
          title="No projects yet"
          description="Projects group related issues, boards and people. Create one to get started."
          action={<NewProjectButton />}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SearchFilter value={values.q} onChange={(q) => set("q", q)} placeholder="Search projects" label="Search projects" />
            <FilterMenu
              label="Status"
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
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
                set("q", "")
                set("status", [])
                set("lead", [])
              }}>
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
              description="Try a different search, or clear the filters to see every project."
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
