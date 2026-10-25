import { AlarmClock, BarChart3, CalendarRange, CircleCheckBig, Flag, Gauge, ListChecks, Users } from "lucide-react"
import { Link } from "react-router"

import { useMemberMap, useProjects, useReport, useWorkspaceAccess } from "@/api/hooks"
import { IssueTypeIcon } from "@/components/issues/issue-badges"
import { PageHeader } from "@/components/page-header"
import { bucketLabel, VELOCITY_SERIES, WORKLOAD_SERIES, workloadRows } from "@/components/reports/chart-utils"
import { CompletedOverTimeChart, StatusDistributionChart, VelocityChart, WorkloadChart } from "@/components/reports/charts"
import { ChartCard, DataTable } from "@/components/reports/chart-card"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { parseApiError } from "@/lib/api-errors"
import { formatDueDate } from "@/lib/dates"
import { paths } from "@/lib/routes"
import { useUrlFilters } from "@/lib/use-url-filters"
import { cn } from "@/lib/utils"
import { issueStatusLabel } from "@/models/issue"
import { MAX_REPORT_RANGE_DAYS, REPORT_RANGES, resolveReportRange } from "@/models/report"
import { PERMS } from "@/models/roles"

function validateCustomRange(from, to) {
  if (!from || !to) return "Choose a start and an end date."
  if (from > to) return "The start date must be on or before the end date."
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 >= MAX_REPORT_RANGE_DAYS) return `Choose a range of at most ${MAX_REPORT_RANGE_DAYS} days.`
  return null
}

function StatTile({ label, value, hint, icon: Icon, tone }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        <Icon aria-hidden="true" className={cn("size-4", tone === "danger" ? "text-danger-text" : "text-primary")} />
      </div>
      <span className={cn("text-2xl font-semibold", tone === "danger" && value > 0 && "text-danger-text")}>{value}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  )
}

function Filters({ values, set, projects, rangeError }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs sm:flex-row sm:flex-wrap sm:items-start">
      <FormField id="report-project" label="Project" className="sm:w-72">
        <NativeSelect value={values.project} onChange={(event) => set("project", event.target.value)}>
          <option value="">All projects you can access</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="report-range" label="Date range" className="sm:w-44">
        <NativeSelect value={values.range} onChange={(event) => set("range", event.target.value)}>
          {REPORT_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      {values.range === "custom" && (
        <>
          <FormField id="report-from" label="From" className="sm:w-40" error={rangeError ?? undefined}>
            <Input type="date" value={values.from} onChange={(event) => set("from", event.target.value)} />
          </FormField>
          <FormField id="report-to" label="To" className="sm:w-40">
            <Input type="date" value={values.to} onChange={(event) => set("to", event.target.value)} />
          </FormField>
        </>
      )}
    </div>
  )
}

function ReportsSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading reports">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-80 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

function OverdueList({ items, total, projectsById, memberMap }) {
  return (
    <div className="grid gap-2">
      <ul className="divide-y overflow-hidden rounded-md border">
        {items.map((issue) => {
          const assignee = memberMap[issue.assigneeId]
          return (
            <li key={issue.key} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <IssueTypeIcon type={issue.type} />
              <div className="min-w-0 flex-1">
                <Link
                  to={paths.issue({ projectId: issue.projectId, key: issue.key })}
                  className="focus-ring block truncate rounded-sm font-medium hover:text-primary"
                >
                  <span className="mr-1.5 font-mono text-xs text-muted-foreground">{issue.key}</span>
                  {issue.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {projectsById[issue.projectId]?.name} · {issueStatusLabel[issue.status]} · due {formatDueDate(issue.dueDate)}
                </p>
              </div>
              {assignee ? (
                <UserAvatar name={assignee.name} size="sm" title={assignee.name} />
              ) : (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              )}
              <Badge variant="danger" className="shrink-0">
                {issue.daysOverdue} {issue.daysOverdue === 1 ? "day" : "days"}
              </Badge>
            </li>
          )
        })}
      </ul>
      {total > items.length && <p className="text-xs text-muted-foreground">Showing the {items.length} most overdue of {total}.</p>}
    </div>
  )
}

function EpicProgressList({ epics, projectsById }) {
  return (
    <ul className="grid gap-4">
      {epics.map((epic) => {
        const percent = epic.total > 0 ? Math.round((epic.done / epic.total) * 100) : null
        return (
          <li key={epic.key} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <Link
                to={paths.issue({ projectId: epic.projectId, key: epic.key })}
                className="focus-ring min-w-0 truncate rounded-sm font-medium hover:text-primary"
              >
                <span className="mr-1.5 font-mono text-xs text-muted-foreground">{epic.key}</span>
                {epic.title}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {epic.total === 0 ? "No issues" : `${epic.done}/${epic.total} issues · ${percent}%`}
              </span>
            </div>
            <Progress value={percent} label={`${epic.title} progress`} />
            <p className="text-xs text-muted-foreground">
              {projectsById[epic.projectId]?.name}
              {epic.points > 0 && ` · ${epic.donePoints} of ${epic.points} points done`}
              {epic.dueDate && ` · due ${formatDueDate(epic.dueDate)}`}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

function ReportBody({ report, isRefreshing, projectsById, memberMap }) {
  const completedSprints = report.sprintVelocity.filter((s) => s.status === "completed")
  const avgVelocity = completedSprints.length
    ? Math.round(completedSprints.reduce((sum, s) => sum + s.completedPoints, 0) / completedSprints.length)
    : null
  const rangeLabel = `${bucketLabel({ start: report.range.from, end: report.range.to }, "week")}`

  return (
    <div className={cn("grid gap-4 transition-opacity", isRefreshing && "opacity-80")}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open issues" value={report.totals.open} hint={`of ${report.totals.issues} issues, epics excluded`} icon={ListChecks} />
        <StatTile label="Completed" value={report.totals.completedInRange} hint={rangeLabel} icon={CircleCheckBig} />
        <StatTile label="Overdue" value={report.totals.overdue} hint="Open and past their due date" icon={AlarmClock} tone="danger" />
        <StatTile
          label="Avg velocity"
          value={avgVelocity ?? "–"}
          hint={avgVelocity == null ? "No sprints completed in range" : `points per sprint, ${completedSprints.length} completed`}
          icon={Gauge}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          id="report-status"
          title="Issue status distribution"
          description="Current status of every issue (epics excluded). Not affected by the date range."
          isRefreshing={isRefreshing}
          empty={report.totals.issues === 0 && { icon: BarChart3, title: "No issues yet", description: "Create issues in these projects to see how work is distributed." }}
          table={() => (
            <DataTable
              caption="Issues by status"
              columns={[
                { key: "status", label: "Status", render: (row) => issueStatusLabel[row.status] },
                { key: "count", label: "Issues", numeric: true },
              ]}
              rows={report.statusDistribution}
              rowKey={(row) => row.status}
            />
          )}
        >
          <StatusDistributionChart data={report.statusDistribution} />
        </ChartCard>

        <ChartCard
          id="report-completed"
          title="Issues completed over time"
          description={`Per ${report.range.granularity} · ${rangeLabel}`}
          isRefreshing={isRefreshing}
          empty={report.totals.completedInRange === 0 && { icon: CircleCheckBig, title: "Nothing completed in this range", description: "Try a longer date range, or check back once issues move to Done." }}
          table={() => (
            <DataTable
              caption="Issues completed per period"
              columns={[
                { key: "start", label: report.range.granularity === "week" ? "Week" : "Day", render: (row) => bucketLabel(row, report.range.granularity) },
                { key: "count", label: "Completed", numeric: true },
                { key: "points", label: "Points", numeric: true },
              ]}
              rows={report.completedOverTime}
              rowKey={(row) => row.start}
            />
          )}
        >
          <CompletedOverTimeChart data={report.completedOverTime} granularity={report.range.granularity} />
        </ChartCard>

        <ChartCard
          id="report-velocity"
          title="Sprint progress and velocity"
          description="Story points committed at sprint start vs. completed. Sprints completed in the range, plus active sprints (•)."
          isRefreshing={isRefreshing}
          empty={report.sprintVelocity.length === 0 && { icon: Flag, title: "No sprints in this range", description: "Velocity appears once a sprint is active or completed in the selected dates." }}
          table={() => (
            <DataTable
              caption="Sprint velocity"
              columns={[
                { key: "name", label: "Sprint", render: (row) => `${row.name}${row.status === "active" ? " (active)" : ""}` },
                ...VELOCITY_SERIES.map((s) => ({ key: s.key, label: s.label, numeric: true })),
                { key: "done", label: "Issues done", numeric: true, render: (row) => `${row.done}/${row.total}` },
              ]}
              rows={report.sprintVelocity}
              rowKey={(row) => row.id}
            />
          )}
        >
          <VelocityChart data={report.sprintVelocity} />
        </ChartCard>

        <ChartCard
          id="report-workload"
          title="Workload by assignee"
          description="Open issues per person, by stage. Not affected by the date range."
          isRefreshing={isRefreshing}
          empty={report.workload.length === 0 && { icon: Users, title: "No open work", description: "Everything in these projects is done." }}
          table={() => (
            <DataTable
              caption="Open issues by assignee"
              columns={[
                { key: "label", label: "Assignee" },
                ...WORKLOAD_SERIES.map((s) => ({ key: s.key, label: s.label, numeric: true })),
                { key: "overdue", label: "Overdue", numeric: true },
                { key: "points", label: "Points", numeric: true },
              ]}
              rows={workloadRows(report.workload)}
              rowKey={(row) => row.assigneeId ?? "unassigned"}
            />
          )}
        >
          <WorkloadChart data={report.workload} />
        </ChartCard>

        <ChartCard
          id="report-overdue"
          title="Overdue issues"
          description="Open issues past their due date, most overdue first."
          meta={report.totals.overdue > 0 && <Badge variant="danger">{report.totals.overdue}</Badge>}
          isRefreshing={isRefreshing}
          empty={report.overdue.length === 0 && { icon: AlarmClock, title: "Nothing overdue", description: "Every open issue is on schedule." }}
        >
          <OverdueList items={report.overdue} total={report.totals.overdue} projectsById={projectsById} memberMap={memberMap} />
        </ChartCard>

        <ChartCard
          id="report-epics"
          title="Epic progress"
          description="Child issues done per epic."
          isRefreshing={isRefreshing}
          empty={report.epicProgress.length === 0 && { icon: Flag, title: "No epics", description: "Group related work into epics to track their progress here." }}
        >
          <EpicProgressList epics={report.epicProgress} projectsById={projectsById} />
        </ChartCard>
      </div>
    </div>
  )
}

/**
 * Workspace reports. Data is aggregated by the API over the projects the
 * caller can access, so private projects never leak into the numbers.
 */
export function ReportsPage() {
  const access = useWorkspaceAccess()
  const { data: projects = [] } = useProjects()
  const memberMap = useMemberMap()
  const { values, set, clear } = useUrlFilters({ project: "", range: "30d", from: "", to: "" })

  const rangeError = values.range === "custom" ? validateCustomRange(values.from, values.to) : null
  const range = rangeError ? {} : resolveReportRange(values)
  const report = useReport({ projectId: values.project, from: range.from, to: range.to })
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]))

  if (!access.isPending && !access.can(PERMS.reportsView)) {
    return (
      <EmptyState variant="bordered" icon={BarChart3} title="Reports aren't available to you" description="Ask a workspace owner or admin for access." />
    )
  }

  const error = report.isError ? parseApiError(report.error, "Couldn't load reports.") : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" description="Progress, velocity and workload across the projects you can access." />
      <Filters values={values} set={set} projects={projects} rangeError={rangeError} />

      {rangeError ? (
        <EmptyState variant="bordered" icon={CalendarRange} title="Choose a valid date range" description={rangeError} />
      ) : error ? (
        <Alert
          variant="danger"
          title={error.status === 404 ? "This project isn't available" : "Couldn't load reports"}
          action={
            error.status === 404 ? (
              <Button variant="secondary" size="sm" onClick={() => clear(["project"])}>
                Show all projects
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => report.refetch()}>
                Try again
              </Button>
            )
          }
        >
          {error.status === 404 ? "It may be private or have been removed." : error.message}
        </Alert>
      ) : report.isPending ? (
        <ReportsSkeleton />
      ) : report.data.projectIds.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={BarChart3}
          title="No projects to report on"
          description="Reports cover the projects you can access. Create a project or ask to be added to one."
        />
      ) : (
        <ReportBody report={report.data} isRefreshing={report.isPlaceholderData} projectsById={projectsById} memberMap={memberMap} />
      )}
    </div>
  )
}
