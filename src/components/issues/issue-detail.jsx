import { useMemo } from "react"
import { Check, CircleAlert, Link2, Loader2 } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { useIssueSaveState, useIssues, useLabels, useMembers, useProject, useSprints, useUpdateIssue } from "@/api/hooks"
import { IconButton } from "@/components/icon-button"
import { IssueActivity } from "@/components/issues/issue-activity"
import { IssueAttachments } from "@/components/issues/issue-attachments"
import { IssueTypeIcon } from "@/components/issues/issue-badges"
import { IssueChildren } from "@/components/issues/issue-children"
import { EditableDescription, EditableTitle } from "@/components/issues/issue-editable"
import {
  DueDatePicker,
  IssueTypeSelect,
  LabelsSelect,
  MemberSelect,
  ParentSelect,
  PrioritySelect,
  SprintSelect,
  StatusSelect,
  StoryPointsSelect,
} from "@/components/issues/issue-fields"
import { ProjectTile } from "@/components/projects/project-tile"
import { Alert } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { parseApiError } from "@/lib/api-errors"
import { formatDateTime } from "@/lib/dates"
import { absoluteUrl, paths } from "@/lib/routes"
import { cn, formatRelativeTime } from "@/lib/utils"
import { allowedParentTypes, isDone, isPlannable, parentRequired } from "@/models/issue"

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for browsers/contexts without the async clipboard API
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand("copy")
    textarea.remove()
    return ok
  }
}

/** Saving… / Saved / Couldn't save, announced politely to screen readers. */
function SaveIndicator({ issueKey }) {
  const { status, error } = useIssueSaveState(issueKey)

  return (
    <span role="status" aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
      {status === "pending" && (
        <>
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          Saving…
        </>
      )}
      {status === "success" && (
        <>
          <Check aria-hidden="true" className="size-3.5 text-success" />
          Saved
        </>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1.5 text-danger-text">
          <CircleAlert aria-hidden="true" className="size-3.5" />
          Couldn't save: {parseApiError(error).message} Changes were reverted.
        </span>
      )}
    </span>
  )
}

function PropertyRow({ label, children }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-2 py-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

function PropertiesPanel({ issue, save, readOnly, projectIssues, sticky = true }) {
  const { data: members = [] } = useMembers()
  const { data: labelOptions = [] } = useLabels()
  const { data: project } = useProject(issue.projectId)
  const { data: sprints = [] } = useSprints(issue.projectId)
  const parentCandidates = projectIssues.filter(
    (candidate) => allowedParentTypes(issue.type).includes(candidate.type) && candidate.id !== issue.id
  )
  const hasChildren = projectIssues.some((candidate) => candidate.parentId === issue.id)

  return (
    <aside
      aria-label="Issue properties"
      className={cn("rounded-lg border bg-card p-4 shadow-xs", sticky && "lg:sticky lg:top-[calc(var(--topbar-height)+1.5rem)]")}
    >
      <StatusSelect value={issue.status} onChange={(status) => save({ status })} disabled={readOnly} className="mb-3 w-auto" />
      <dl className="divide-y divide-transparent">
        <PropertyRow label="Assignee">
          <MemberSelect variant="inline" value={issue.assigneeId} onChange={(assigneeId) => save({ assigneeId })} members={members} disabled={readOnly} />
        </PropertyRow>
        <PropertyRow label="Reporter">
          <MemberSelect
            variant="inline"
            label="Reporter"
            noneLabel="No reporter"
            value={issue.reporterId}
            onChange={(reporterId) => save({ reporterId })}
            members={members}
            allowNone={false}
            disabled={readOnly}
          />
        </PropertyRow>
        <PropertyRow label="Priority">
          <PrioritySelect variant="inline" value={issue.priority} onChange={(priority) => save({ priority })} disabled={readOnly} />
        </PropertyRow>
        <PropertyRow label="Type">
          <IssueTypeSelect
            variant="inline"
            value={issue.type}
            onChange={(type) => {
              const parent = projectIssues.find((candidate) => candidate.id === issue.parentId)
              const patch = { type }
              if (parent && !allowedParentTypes(type).includes(parent.type)) patch.parentId = null
              save(patch)
            }}
            // Changing type would break the hierarchy for issues with children or a required parent
            types={hasChildren || issue.type === "subtask" ? [issue.type] : ["epic", "story", "task", "bug"].filter((t) => t !== "epic" || !issue.parentId)}
            disabled={readOnly}
          />
        </PropertyRow>
        <PropertyRow label="Labels">
          <LabelsSelect variant="inline" value={issue.labels} onChange={(labels) => save({ labels })} options={labelOptions} disabled={readOnly} />
        </PropertyRow>
        <PropertyRow label="Due date">
          <DueDatePicker variant="inline" value={issue.dueDate} done={isDone(issue)} onChange={(dueDate) => save({ dueDate })} disabled={readOnly} />
        </PropertyRow>
        {isPlannable(issue) && sprints.length > 0 && (
          <PropertyRow label="Sprint">
            <SprintSelect variant="inline" value={issue.sprintId} onChange={(sprintId) => save({ sprintId })} sprints={sprints} disabled={readOnly} />
          </PropertyRow>
        )}
        <PropertyRow label="Story points">
          <StoryPointsSelect variant="inline" value={issue.storyPoints} onChange={(storyPoints) => save({ storyPoints })} disabled={readOnly} />
        </PropertyRow>
        {allowedParentTypes(issue.type).length > 0 && (
          <PropertyRow label={issue.type === "subtask" ? "Parent" : "Epic"}>
            <ParentSelect
              variant="inline"
              value={issue.parentId}
              onChange={(parentId) => save({ parentId })}
              candidates={parentCandidates}
              allowNone={!parentRequired(issue.type)}
              disabled={readOnly}
            />
          </PropertyRow>
        )}
        <PropertyRow label="Project">
          {project ? (
            <Link to={paths.project(project.id)} className="focus-ring flex items-center gap-2 rounded-sm text-sm hover:text-primary">
              <ProjectTile label={project.key} size="sm" />
              <span className="truncate">{project.name}</span>
            </Link>
          ) : (
            <Skeleton className="h-4 w-32" />
          )}
        </PropertyRow>
      </dl>
      <div className="mt-3 grid grid-cols-1 gap-1 border-t pt-3 text-xs text-muted-foreground">
        <p>
          Created <time dateTime={issue.createdAt} title={formatDateTime(issue.createdAt)}>{formatRelativeTime(issue.createdAt)}</time>
        </p>
        <p>
          Updated <time dateTime={issue.updatedAt} title={formatDateTime(issue.updatedAt)}>{formatRelativeTime(issue.updatedAt)}</time>
        </p>
      </div>
    </aside>
  )
}

/**
 * Full issue view: editable title, description and properties, child issues,
 * attachments, comments and history. Edits are optimistic and roll back on error.
 */
export function IssueDetail({ issue, layout = "page" }) {
  const isPanel = layout === "panel"
  const update = useUpdateIssue(issue.key)
  const { data: projectIssues = [] } = useIssues({ projectId: issue.projectId })
  const readOnly = issue.permissions?.canEdit === false

  const issuesById = useMemo(() => Object.fromEntries(projectIssues.map((i) => [i.id, i])), [projectIssues])
  const parent = issuesById[issue.parentId]
  const childIssues = projectIssues.filter((candidate) => candidate.parentId === issue.id)

  /** For field pickers: optimistic save, toast on failure. */
  function save(patch) {
    update.mutate(patch, {
      onError: (error) => toast.error("Couldn't save your change", { description: parseApiError(error).message }),
    })
  }

  /** For inline editors that keep their draft on failure: they await the result. */
  const saveAsync = (patch) => update.mutateAsync(patch)

  async function copyLink() {
    const ok = await copyToClipboard(absoluteUrl(paths.issue(issue)))
    if (ok) toast.success("Link copied", { description: `${issue.key} · ${issue.title}` })
    else toast.error("Couldn't copy the link", { description: "Copy it from the address bar instead." })
  }

  return (
    <div className={cn("grid grid-cols-1 gap-8", !isPanel && "lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start")}>
      <div className="grid grid-cols-1 min-w-0 gap-8">
        <header className="grid grid-cols-1 gap-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {parent && (
              <>
                <Link to={paths.issue(parent)} className="focus-ring flex items-center gap-1.5 rounded-sm text-muted-foreground hover:text-primary">
                  <IssueTypeIcon type={parent.type} size="sm" />
                  <span className="font-mono text-xs">{parent.key}</span>
                  <span className="max-w-48 truncate">{parent.title}</span>
                </Link>
                <span aria-hidden="true" className="text-muted-foreground/60">/</span>
              </>
            )}
            <span className="flex items-center gap-1.5">
              <IssueTypeIcon type={issue.type} size="sm" label />
              <span className="font-mono text-xs text-muted-foreground">{issue.key}</span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <SaveIndicator issueKey={issue.key} />
              <IconButton label="Copy issue link" icon={Link2} size="icon-sm" onClick={copyLink} />
            </div>
          </div>
          <EditableTitle value={issue.title} onSave={(title) => saveAsync({ title })} disabled={readOnly} />
          {readOnly && <Alert variant="info">You can view this issue but don't have permission to edit it.</Alert>}
        </header>

        <section aria-labelledby="issue-description-heading">
          <h2 id="issue-description-heading" className="mb-2">
            Description
          </h2>
          <EditableDescription value={issue.description} onSave={(description) => saveAsync({ description })} disabled={readOnly} />
        </section>

        <IssueChildren issue={issue} childIssues={childIssues} disabled={readOnly} />
        <IssueAttachments issue={issue} disabled={readOnly} />

        {/* Properties sit here on small screens, beside the content on large ones */}
        <div className={isPanel ? undefined : "lg:hidden"}>
          <PropertiesPanel issue={issue} save={save} readOnly={readOnly} projectIssues={projectIssues} sticky={false} />
        </div>

        <IssueActivity issue={issue} issuesById={issuesById} />
      </div>

      <div className={isPanel ? "hidden" : "hidden lg:block"}>
        <PropertiesPanel issue={issue} save={save} readOnly={readOnly} projectIssues={projectIssues} />
      </div>
    </div>
  )
}

export function IssueDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading issue" className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid grid-cols-1 content-start gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  )
}
