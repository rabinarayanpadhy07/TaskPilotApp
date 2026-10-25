# Workspace content API (projects, issues, sprints, activity, notifications)

Implemented in `backend/` (apps `workspaces`, `projects`, `issues`, `sprints`,
`activity`, `notifications`, `reports`) and consumed by
`src/services/workspace-data-service.js`. Auth endpoints are in [`auth-api.md`](auth-api.md).
The generated OpenAPI schema (`/api/schema/`, browsable at `/api/docs/`) is the
authoritative reference; this page explains behaviour the schema can't express.
Field mapping (snake_case ⇄ camelCase) lives in `src/models/`.

## Conventions

- All endpoints require `Authorization: Bearer <access>` and are scoped to a
  workspace the user belongs to (`/workspaces/:ws/...`). The API returns `404` for
  workspaces/resources the user can't see (don't leak existence).
- Every list is paginated: `?page=N&page_size=M` (default 50, max 200) →
  `{ count, next, previous, results }`. Screens that need complete lists follow `next`.
- Issue list filters: `project`, `assignee` (id or `none`), `sprint` (id or `none`),
  `parent`, `status`, `issue_type`, `priority` (repeatable), `label`, `q` (title/key),
  `due_before`, `open` (true/false), `updated_after`.
- Errors use DRF shapes (`{"detail": ...}` or `{"field": ["..."]}`); field errors are shown inline.
- **Permissions are enforced by the API on every request.** The `permissions`
  object on issues only lets the UI disable controls; a `403` is shown as an error.

## Projects

### `GET /workspaces/:ws/projects/`
```json
[{
  "id": 1, "workspace": 3, "key": "WEB", "name": "Website redesign",
  "description": "…", "status": "on_track", "visibility": "workspace",
  "lead": 7, "members": [7, 8, 9],
  "issue_counts": {
    "total": 11, "done": 3, "open": 8, "overdue": 2,
    "by_status": { "backlog": 1, "todo": 4, "in_progress": 2, "in_review": 1, "done": 3 },
    "by_type": { "epic": 2, "story": 3, "task": 4, "bug": 2, "subtask": 2 }
  },
  "created_at": "…", "updated_at": "…"
}]
```
- `status`: `on_track | at_risk | off_track | planning | completed`
- `visibility`: `workspace | private` (private: only members can see it — filter server-side)
- `issue_counts` must be **computed from real issues** (annotate/aggregate).
  `total`, `done`, `open`, `overdue` and `by_status` exclude epics; `by_type` includes them.
  The UI's progress % is `done / total`; it shows "No issues yet" when `total` is 0.

### `POST /workspaces/:ws/projects/`
```json
{ "name": "Customer portal", "key": "CP", "description": "", "visibility": "private", "lead": 7 }
```
`201` with the project. Validate: `key` matches `^[A-Z][A-Z0-9]{1,9}$` and is unique
per workspace (`{"key": ["A project with key CP already exists in this workspace."]}`);
`lead` is a workspace member. The creator becomes a member.

## Issues

```json
{
  "id": 42, "key": "WEB-9", "project": 1,
  "issue_type": "story", "title": "Update pricing page layout", "description": "…",
  "status": "in_progress", "priority": "high",
  "assignee": 7, "reporter": 8, "labels": ["pricing"],
  "due_date": "2026-10-12", "story_points": 5, "parent": 40,
  "sprint": 12, "rank": 4500.0,
  "created_at": "…", "updated_at": "…", "completed_at": null,
  "comment_count": 2, "attachment_count": 0,
  "permissions": { "can_edit": true, "can_comment": true }
}
```
- `issue_type`: `epic | story | task | bug | subtask`
- `status`: `backlog | todo | in_progress | in_review | done` (set `completed_at` when entering `done`, clear when leaving)
- `priority`: `highest | high | medium | low | lowest`
- `key`: `<PROJECT_KEY>-<n>`, allocated server-side (use a per-project counter with a row lock)
- `sprint`: only stories/tasks/bugs can be planned in a sprint, and only in an open (planned/active) sprint of the same project
- `rank`: ordering for the board and backlog. Server-assigned; see **Moving issues**
- **Hierarchy rules** (validate in the serializer, mirrored in `src/models/issue.js`):
  epics have no parent; stories/tasks/bugs may have an epic parent; subtasks
  **must** have a story/task/bug parent; parent must be in the same project.

| Method | Path | Notes |
| ------ | ---- | ----- |
| `GET` | `/workspaces/:ws/issues/?project=&assignee=` | Filters used by the UI today. Search/status/type filters run client-side for now; move them to query params when lists get large. |
| `POST` | `/workspaces/:ws/issues/` | Reporter = request user. Returns the issue with its `key`. |
| `GET` | `/workspaces/:ws/issues/:key/` | `404` if missing or not visible. |
| `PATCH` | `/workspaces/:ws/issues/:key/` | Partial update with only changed fields. Record an activity entry per changed field. |
| `GET` | `/workspaces/:ws/labels/` | Distinct labels in the workspace (strings or `{name}` objects). |

## Moving issues (board & backlog drag-and-drop)

`POST /workspaces/:ws/issues/:key/move/`

```json
{ "status": "in_review", "sprint": 12, "parent": 40, "before": "WEB-3", "after": "WEB-9" }
```

All fields optional: send only what changes plus the new neighbours (`before` /
`after` = the issue keys directly above/below the drop position, `null` at the
ends). The server must:

1. **Authorize** the user for the issue (and target sprint/epic).
2. **Validate** the change: status value, sprint belongs to the project and isn't
   completed, epic hierarchy rules, neighbours exist in the same project.
3. **Assign the rank** between the neighbours (e.g. midpoint of their ranks;
   renumber the list in a transaction when gaps get too small, or use LexoRank).
4. Record activity entries and return the updated issue (`200`).

The UI moves the card immediately but keeps the result provisional: on any
`4xx/5xx` it rolls back and shows the error. The server response is the source
of truth for the final position.

## Bulk edits (backlog selection)

`POST /workspaces/:ws/issues/bulk/`

```json
{ "keys": ["WEB-6", "WEB-10"], "changes": { "priority": "highest" } }
```

`changes` may contain `status`, `sprint`, `assignee`, `priority`. Apply in **one
transaction** (all or nothing), authorize every issue, return the updated
issues. On failure return `400` with a `detail` naming the offending issue.

## Sprints

```json
{
  "id": 12, "project": 1, "name": "WEB Sprint 2", "goal": "…",
  "start_date": "2026-10-05", "end_date": "2026-10-19",
  "status": "active", "completed_at": null,
  "stats": { "total": 7, "done": 2, "points": 20, "done_points": 4, "by_status": { "todo": 2, "done": 2 } }
}
```

`stats` must be computed from the sprint's stories/tasks/bugs (no estimates).

| Method | Path | Notes |
| ------ | ---- | ----- |
| `GET` | `/workspaces/:ws/projects/:id/sprints/` | Active first, then planned, then completed |
| `POST` | same | `{ name, goal, start_date?, end_date? }` → `201`, status `planned` |
| `PATCH` | `/workspaces/:ws/sprints/:id/` | Not allowed for completed sprints |
| `POST` | `/workspaces/:ws/sprints/:id/start/` | `{ start_date, end_date, goal? }` |
| `POST` | `/workspaces/:ws/sprints/:id/complete/` | `{ move_open_issues_to: <planned sprint id> \| null }` |

**Business rules** (enforced server-side; the UI mirrors them in `src/models/sprint.js`):

- `end_date` must be after `start_date`; both or neither for planned sprints.
- Planned/active sprints in a project may not have overlapping date ranges
  (`{"start_date": ["These dates overlap WEB Sprint 3 (…)."]}`).
- Only one **active** sprint per project; starting another returns `400`.
- A sprint needs at least one issue to start.
- Completing: done issues stay in the sprint; open ones move to the backlog
  (`null`) or to a planned sprint of the same project.

## Comments

| Method | Path | Body / response |
| ------ | ---- | --------------- |
| `GET` | `/workspaces/:ws/issues/:key/comments/` | `[{ id, issue, author, body, created_at, edited_at, permissions: { can_edit, can_delete } }]`, oldest first |
| `POST` | same | `{ "body": "…" }` (1–5000 chars) → `201` comment |
| `PATCH` | `/workspaces/:ws/issues/:key/comments/:id/` | `{ "body": "…" }`; sets `edited_at`. Author only, else `403` |
| `DELETE` | `/workspaces/:ws/issues/:key/comments/:id/` | Author or project lead/admin, else `403` |

`permissions` is computed per requesting user and only decides which actions
the UI shows; the endpoints must enforce the same rules.

## Activity

`GET /workspaces/:ws/issues/:key/activity/` (oldest first) and
`GET /workspaces/:ws/activity/?page_size=20` (newest first, workspace-wide, only projects the caller can see):
```json
{ "id": 1, "issue": 42, "issue_key": "WEB-9", "issue_title": "…", "actor": 7,
  "kind": "updated", "field": "status", "from_value": "todo", "to_value": "in_progress",
  "created_at": "…" }
```
`kind`: `created | updated | commented | attachment_added`. For `updated`, `field`
uses the API field name mapped by the client (`status`, `priority`, `assignee`,
`reporter`, `labels`, `due_date`, `story_points`, `parent`, `title`, `description`,
`issue_type`). Omit values for `description`.

## Attachments

| Method | Path | Notes |
| ------ | ---- | ----- |
| `GET` | `/workspaces/:ws/issues/:key/attachments/` | `[{ id, file_name, size, content_type, url, uploaded_by, created_at }]` |
| `POST` | same, `multipart/form-data` with `file` | Enforce the 10 MB limit and an allow-list of types server-side; store outside the web root (e.g. S3) and return a short-lived signed `url`. |
| `DELETE` | `/workspaces/:ws/issues/:key/attachments/:id/` | Uploader or project admin |

## Search

`GET /workspaces/:ws/search/?q=<text>&limit=8` →
`{ "projects": [...], "issues": [...], "members": [...] }` (same shapes as the
list endpoints). The UI debounces requests by 250 ms, only searches from 2
characters, and keeps previous results visible while the next request runs.
Respect project visibility: private projects and their issues only for members.

## Members, teams, notifications

- `GET /workspaces/:ws/members/` → see **Access management** below
- `GET /workspaces/:ws/teams/` → `[{ id, name, member_ids }]`
- `GET /notifications/?workspace=:ws` →
  `[{ id, category, actor, summary, issue_key, issue_title, project, excerpt, created_at, read }]`
  - `category`: `assignment | mention | comment | update`
  - Created **server-side** when the event happens (assignment, @mention in a
    comment, comment on a watched issue, status/field change). The frontend never
    fabricates notifications; with the real API it polls every 30 s and on window
    focus (swap for WebSockets/SSE later without UI changes).
- `POST /notifications/mark-read/` → `{ "workspace": ws, "ids": [...] | null }` (`null` = all)
- `POST /notifications/:id/mark-unread/`

## Access management (roles, members, invitations)

Implemented in `backend/` (see `backend/docs/authorization.md` for the full
role matrix). Roles: `owner | admin | project_manager | developer | viewer`.
**The client never sends its own role or workspace for authorization**: the API
reads them from its membership tables. Fields that describe the caller
(`role`, `permissions`, `assignable_roles`, `my_role`, per-row `permissions`)
only shape the UI.

### `GET /workspaces/`
```json
[{ "id": 3, "name": "Acme", "slug": "acme", "role": "admin",
   "permissions": ["members.invite", "members.manage", "projects.create", "..."],
   "assignable_roles": ["project_manager", "developer", "viewer"],
   "member_ids": [7, 8, 9] }]
```
Only workspaces the caller belongs to.

### Members

| Method | Path | Notes |
| ------ | ---- | ----- |
| `GET` | `/workspaces/:ws/members/` | `[{ id, email, full_name, title, role, joined_at, permissions: { can_change_role, can_remove, can_leave } }]` |
| `PATCH` | `/workspaces/:ws/members/:user_id/` | `{ "role": "developer" }`. `403` unless `members.manage`, the target's role is below the caller's (owners: anyone) and the new role is assignable; can't change your own role; `400` if it would leave no owner |
| `DELETE` | `/workspaces/:ws/members/:user_id/` | Remove (`members.manage` + hierarchy) or leave (your own id). `400` for the last owner. Their project memberships go, open issues are unassigned |

### Invitations (`members.invite`)

| Method | Path | Notes |
| ------ | ---- | ----- |
| `GET` | `/workspaces/:ws/invitations/` | Pending only: `[{ id, email, role, invited_by, created_at, expires_at, permissions: { can_revoke } }]` |
| `POST` | same | `{ email, role }` → `201` with `invite_url` (returned **once**; only a hash of the token is stored). `403` for a role the caller can't grant, `400` if already a member. Re-inviting replaces the open invitation |
| `DELETE` | `/workspaces/:ws/invitations/:id/` | Revoke |

Accepting (`POST /invitations/:token/accept/`) requires the signed-in email to
match the invited email (`403` otherwise); invitations are single-use and expire.

### Projects: access fields and settings

Project responses also include `my_role` (`manager | contributor | viewer`)
and `permissions` (e.g. `["project.view", "issues.write", "issues.comment"]`).
Private projects are omitted (and `404`) for people who can't see them.

| Method | Path | Notes |
| ------ | ---- | ----- |
| `PATCH` | `/workspaces/:ws/projects/:id/` | `name, description, status, visibility, lead`; needs `project.update` |
| `DELETE` | same | `projects.delete` (owners, admins) |
| `GET` | `/workspaces/:ws/projects/:id/members/` | `[{ id, email, full_name, title, role, workspace_role, effective_role, added_at }]` |
| `POST` | same | `{ user, role }`; `project.members.manage`. `user` must be a workspace member; `role` can't exceed the workspace role's ceiling (`400`) |
| `PATCH` / `DELETE` | `/workspaces/:ws/projects/:id/members/:user_id/` | Change role / remove (clears the lead if it was them) |

Issue `permissions` gain `can_delete`. Sprint writes need `sprints.manage`;
sprints also return `committed_points` (snapshot at start) and
`completed_points` (snapshot at completion) for velocity.

## Reports

`GET /workspaces/:ws/reports/?project=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD`
(defaults: all visible projects, last 30 days; max 366 days). Needs
`reports.view`; aggregated over the projects the caller can see only, and a
hidden/foreign `project` is `404`.

```json
{
  "range": { "from": "2026-09-11", "to": "2026-10-10", "granularity": "day" },
  "projects": [1, 2],
  "totals": { "issues": 46, "open": 25, "completed_in_range": 18, "overdue": 3 },
  "status_distribution": [{ "status": "todo", "count": 11 }],
  "completed_over_time": [{ "start": "2026-09-11", "end": "2026-09-11", "count": 1, "points": 3 }],
  "sprint_velocity": [{ "id": 4, "name": "MOB Sprint 6", "project": 2, "project_key": "MOB", "status": "completed",
                        "start_date": "…", "end_date": "…", "committed_points": 18, "completed_points": 13, "total": 2, "done": 2 }],
  "workload": [{ "assignee": { "id": 7, "full_name": "…", "email": "…" }, "by_status": { "todo": 2 }, "open": 2, "points": 5, "overdue": 1 }],
  "overdue": [{ "key": "WEB-5", "title": "…", "project": 1, "issue_type": "bug", "priority": "high",
                "status": "in_progress", "assignee": 7, "due_date": "…", "days_overdue": 1 }],
  "epic_progress": [{ "key": "WEB-1", "title": "…", "project": 1, "status": "in_progress", "due_date": "…",
                      "total": 9, "done": 4, "points": 26, "done_points": 12 }]
}
```
`granularity` is `day` for ranges up to 31 days, otherwise `week` (Monday
start, clipped to the range). Status distribution, workload, overdue and epic
progress are current snapshots (epics excluded except in `epic_progress`);
completions and velocity follow the date range (completed sprints in range,
plus active sprints).
