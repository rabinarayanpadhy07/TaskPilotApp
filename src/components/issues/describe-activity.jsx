import { formatDueDate } from "@/lib/dates"
import { issuePriorityLabel, issueStatusLabel, issueTypeLabel } from "@/models/issue"

const fieldLabels = {
  status: "status",
  priority: "priority",
  assigneeId: "assignee",
  reporterId: "reporter",
  labels: "labels",
  dueDate: "due date",
  storyPoints: "story points",
  parentId: "parent",
  sprintId: "sprint",
  type: "type",
}

function formatValue(field, value, { memberMap, issuesById, sprintsById = {} }) {
  if (field === "sprintId") return value == null ? "the backlog" : (sprintsById[value]?.name ?? "a sprint")
  if (value == null || (Array.isArray(value) && value.length === 0)) return "none"
  switch (field) {
    case "status":
      return issueStatusLabel[value] ?? value
    case "priority":
      return issuePriorityLabel[value] ?? value
    case "type":
      return issueTypeLabel[value] ?? value
    case "assigneeId":
    case "reporterId":
      return memberMap[value]?.name ?? "a former member"
    case "dueDate":
      return formatDueDate(value)
    case "labels":
      return value.join(", ")
    case "parentId":
      return issuesById[value]?.key ?? "another issue"
    default:
      return String(value)
  }
}

/** Human-readable sentence for one history event. */
export function describeActivity(event, context) {
  switch (event.kind) {
    case "created":
      return "created the issue"
    case "commented":
      return "added a comment"
    case "attachment_added":
      return `attached ${event.to}`
    case "updated":
      if (event.field === "description") return "updated the description"
      if (event.field === "title") return `renamed the issue to “${event.to}”`
      if (event.field === "sprintId") {
        return (
          <>
            moved it from <span className="font-medium text-foreground">{formatValue("sprintId", event.from, context)}</span> to{" "}
            <span className="font-medium text-foreground">{formatValue("sprintId", event.to, context)}</span>
          </>
        )
      }
      return (
        <>
          changed the {fieldLabels[event.field] ?? event.field} from{" "}
          <span className="font-medium text-foreground">{formatValue(event.field, event.from, context)}</span> to{" "}
          <span className="font-medium text-foreground">{formatValue(event.field, event.to, context)}</span>
        </>
      )
    default:
      return "updated the issue"
  }
}
