import { AlarmClock, ListTodo, Plus, SearchX } from "lucide-react"

import { useMemberMap, useMyIssues, useProjects } from "@/api/hooks"
import { FilterMenu, SearchFilter } from "@/components/filters"
import { PriorityBadge } from "@/components/issues/issue-badges"
import { CreateIssueDialog } from "@/components/issues/issue-form"
import { IssueList, IssueListSkeleton, IssueRow } from "@/components/issues/issue-row"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { QueryError } from "@/components/ui/query-error"
import { useUrlFilters } from "@/lib/use-url-filters"
import { cn } from "@/lib/utils"
import { compareIssuesByUrgency, isDone, isOverdue, ISSUE_PRIORITIES } from "@/models/issue"

const filterDefaults = { show: "open", q: "", priority: [], project: [], due: "" }

function ShowTabs({ value, onChange, counts }) {
  const options = [
    { value: "open", label: "Open" },
    { value: "done", label: "Done" },
  ]
  return (
    <div role="group" aria-label="Show" className="inline-flex rounded-md border bg-surface p-0.5 shadow-xs">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "focus-ring flex h-7 cursor-pointer items-center gap-1.5 rounded-[5px] px-3 text-sm font-medium transition-colors",
            value === option.value ? "bg-selected text-selected-foreground" : "text-muted-foreground hover:bg-hover hover:text-foreground"
          )}
        >
          {option.label}
          <span className="text-xs tabular-nums opacity-70">{counts[option.value]}</span>
        </button>
      ))}
    </div>
  )
}

export function MyTasksPage() {
  const { data: issues = [], isPending, error, refetch, isFetching } = useMyIssues()
  const { data: projects = [] } = useProjects()
  const memberMap = useMemberMap()
  const { values, set, clear } = useUrlFilters(filterDefaults)
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]))

  const work = issues.filter((issue) => issue.type !== "epic")
  const counts = { open: work.filter((i) => !isDone(i)).length, done: work.filter(isDone).length }
  const query = values.q.trim().toLowerCase()

  const visible = work
    .filter((issue) => (values.show === "done" ? isDone(issue) : !isDone(issue)))
    .filter((issue) => !query || issue.title.toLowerCase().includes(query) || issue.key.toLowerCase().includes(query))
    .filter((issue) => values.priority.length === 0 || values.priority.includes(issue.priority))
    .filter((issue) => values.project.length === 0 || values.project.includes(issue.projectId))
    .filter((issue) => values.due !== "overdue" || isOverdue(issue))
    .sort(values.show === "done" ? (a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "") : compareIssuesByUrgency)

  const filtersActive = Boolean(query) || values.priority.length > 0 || values.project.length > 0 || values.due === "overdue"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Tasks"
        description="Stories, tasks, bugs and subtasks assigned to you, most urgent first."
        actions={
          <CreateIssueDialog>
            <Button>
              <Plus />
              Create issue
            </Button>
          </CreateIssueDialog>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ShowTabs value={values.show} onChange={(show) => set("show", show === "open" ? "" : show)} counts={counts} />
        <SearchFilter value={values.q} onChange={(q) => set("q", q)} placeholder="Search by title or key" label="Search my tasks" />
        <FilterMenu
          label="Priority"
          options={ISSUE_PRIORITIES}
          value={values.priority}
          onChange={(v) => set("priority", v)}
          renderOption={(option) => <PriorityBadge priority={option.value} />}
        />
        <FilterMenu
          label="Project"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          value={values.project}
          onChange={(v) => set("project", v)}
        />
        {values.show !== "done" && (
          <Button
            variant="secondary"
            size="sm"
            aria-pressed={values.due === "overdue"}
            onClick={() => set("due", values.due === "overdue" ? "" : "overdue")}
            className={cn(values.due === "overdue" && "border-danger/30 bg-danger/5 text-danger-text hover:bg-danger/10")}
          >
            <AlarmClock />
            Overdue only
          </Button>
        )}
        {filtersActive && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clear}>
            Clear filters
          </Button>
        )}
      </div>

      {error ? (
        <QueryError error={error} title="Couldn't load your issues" onRetry={refetch} retrying={isFetching} />
      ) : isPending ? (
        <IssueListSkeleton rows={5} />
      ) : visible.length > 0 ? (
        <>
          <p className="sr-only" role="status">
            {visible.length} {visible.length === 1 ? "issue" : "issues"} shown
          </p>
          <IssueList label="My issues">
            {visible.map((issue) => (
              <li key={issue.id}>
                <IssueRow issue={issue} assignee={memberMap[issue.assigneeId]} projectName={projectsById[issue.projectId]?.name} />
              </li>
            ))}
          </IssueList>
        </>
      ) : filtersActive ? (
        <EmptyState
          variant="bordered"
          icon={SearchX}
          title="No issues match your filters"
          description="Try a different search or clear the filters."
          action={
            <Button variant="secondary" onClick={clear}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <EmptyState
          variant="bordered"
          icon={ListTodo}
          title={values.show === "done" ? "Nothing completed yet" : "You're all caught up"}
          description={values.show === "done" ? "Issues you complete will show up here." : "No open issues are assigned to you."}
        />
      )}
    </div>
  )
}
