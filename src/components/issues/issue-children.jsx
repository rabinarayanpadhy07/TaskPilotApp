import { useState } from "react"
import { Plus } from "lucide-react"

import { useCreateIssue, useMemberMap } from "@/api/hooks"
import { IssueTypeSelect } from "@/components/issues/issue-fields"
import { IssueList, IssueRow } from "@/components/issues/issue-row"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { parseApiError } from "@/lib/api-errors"
import { allowedChildTypes, isDone } from "@/models/issue"

/**
 * Subtasks (for stories, tasks and bugs) or child issues (for epics), with
 * inline creation: type a title, press Enter, keep typing the next one.
 */
export function IssueChildren({ issue, childIssues, disabled = false }) {
  const createIssue = useCreateIssue()
  const memberMap = useMemberMap()
  const childTypes = allowedChildTypes(issue.type)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState(childTypes[0] === "story" ? "task" : childTypes[0])
  const [error, setError] = useState(null)
  const [announcement, setAnnouncement] = useState("")

  if (childTypes.length === 0) return null

  const isEpic = issue.type === "epic"
  const heading = isEpic ? "Child issues" : "Subtasks"
  const doneCount = childIssues.filter(isDone).length

  async function create() {
    const trimmed = title.trim()
    if (!trimmed) {
      setError("Enter a title.")
      return
    }
    setError(null)
    try {
      const created = await createIssue.mutateAsync({
        projectId: issue.projectId,
        parentId: issue.id,
        type,
        title: trimmed,
        description: "",
        status: "todo",
        priority: "medium",
        assigneeId: null,
        labels: [],
        dueDate: null,
        storyPoints: null,
      })
      setTitle("")
      setAnnouncement(`${created.key} created`)
    } catch (err) {
      const parsed = parseApiError(err)
      setError(parsed.fieldErrors.title ?? parsed.fieldErrors.parent ?? parsed.message)
    }
  }

  return (
    <section aria-labelledby="issue-children-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="issue-children-heading" className="flex items-center gap-2">
          {heading}
          {childIssues.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {doneCount} of {childIssues.length} done
            </span>
          )}
        </h2>
        {!disabled && !adding && (
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus />
            {isEpic ? "Add issue" : "Add subtask"}
          </Button>
        )}
      </div>

      {childIssues.length > 0 && (
        <div
          role="progressbar"
          aria-label={`${heading} completed`}
          aria-valuemin={0}
          aria-valuemax={childIssues.length}
          aria-valuenow={doneCount}
          className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-success" style={{ width: `${(doneCount / childIssues.length) * 100}%` }} />
        </div>
      )}

      {childIssues.length > 0 && (
        <IssueList label={heading}>
          {childIssues.map((child) => (
            <li key={child.id}>
              <IssueRow issue={child} assignee={memberMap[child.assigneeId]} density="compact" />
            </li>
          ))}
        </IssueList>
      )}
      {childIssues.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          {isEpic ? "No issues in this epic yet." : "Break this work down into subtasks."}
        </p>
      )}

      {adding && (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border bg-surface p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            {childTypes.length > 1 && (
              <div className="sm:w-36">
                <IssueTypeSelect value={type} onChange={setType} types={childTypes} />
              </div>
            )}
            <label htmlFor="new-child-title" className="sr-only">
              {isEpic ? "New issue title" : "New subtask title"}
            </label>
            <Input
              id="new-child-title"
              value={title}
              autoFocus
              autoComplete="off"
              placeholder={isEpic ? "What needs to be done?" : "Subtask title"}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "new-child-error" : "new-child-hint"}
              onChange={(event) => {
                setTitle(event.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  create()
                } else if (event.key === "Escape") {
                  setAdding(false)
                  setTitle("")
                  setError(null)
                }
              }}
            />
          </div>
          {error ? (
            <p id="new-child-error" role="alert" className="text-xs text-danger-text">
              {error}
            </p>
          ) : (
            <p id="new-child-hint" className="text-xs text-muted-foreground">
              Enter to create · Esc to close. New items start in To do.
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={create} loading={createIssue.isPending}>
              {createIssue.isPending ? "Creating…" : "Create"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false)
                setTitle("")
                setError(null)
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
      <p className="sr-only" role="status">
        {announcement}
      </p>
    </section>
  )
}
