/**
 * Notification model.
 *
 * @typedef {"assignment"|"mention"|"comment"|"update"} NotificationCategory
 *
 * @typedef {object} Notification
 * @property {string} id
 * @property {NotificationCategory} category
 * @property {string} actorId
 * @property {string|null} issueKey
 * @property {string|null} issueTitle
 * @property {string|null} projectId
 * @property {string} summary      e.g. "assigned you to", "moved to In review"
 * @property {string|null} excerpt comment text for mentions/comments
 * @property {string} createdAt
 * @property {boolean} read
 */

export const NOTIFICATION_CATEGORIES = [
  { value: "assignment", label: "Assigned", description: "Issues assigned to you" },
  { value: "mention", label: "Mentions", description: "When someone @mentions you" },
  { value: "comment", label: "Comments", description: "Comments on issues you follow" },
  { value: "update", label: "Updates", description: "Status and field changes" },
]

export const notificationCategoryLabel = Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c.value, c.label]))

export function notificationFromApi(data, workspaceId) {
  return {
    id: String(data.id),
    workspaceId: String(workspaceId),
    category: data.category,
    actorId: data.actor == null ? null : String(data.actor.id ?? data.actor),
    issueKey: data.issue_key ?? null,
    issueTitle: data.issue_title ?? null,
    projectId: data.project == null ? null : String(data.project),
    summary: data.summary,
    excerpt: data.excerpt ?? null,
    createdAt: data.created_at,
    read: Boolean(data.read),
  }
}
