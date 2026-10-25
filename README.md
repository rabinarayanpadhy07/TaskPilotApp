# TaskPilot — Frontend

React + Vite (JavaScript) frontend for TaskPilot.

## Stack

| Concern       | Library                                   |
| ------------- | ----------------------------------------- |
| Build         | Vite 8, React 19                          |
| Styling       | Tailwind CSS 4 (`@tailwindcss/vite`)      |
| Components    | shadcn/ui (Radix primitives, JS mode)     |
| Icons         | lucide-react                              |
| Routing       | React Router                              |
| HTTP          | Axios (`src/lib/api-client.js`)           |
| Server state  | TanStack Query (`src/lib/query-client.js`)|
| Client state  | Zustand (`src/stores/`)                   |
| Forms         | React Hook Form + Zod (`src/validation/`) |
| Font          | Inter Variable (self-hosted via Fontsource)|

## Getting started

The app needs the Django API (see `../backend/README.md`): start it first, then

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

Configuration (`.env.development` / `.env.production`, overridable in `.env.local`; see
`.env.example`). Only `VITE_*` variables reach the browser bundle, so never put secrets
or database credentials in them.

- Development: requests to `/api/*` are proxied to Django at `VITE_API_PROXY_TARGET`
  (default `http://localhost:8000`), so no CORS setup is needed.
- Production: `VITE_API_BASE_URL` (default `/api`, same origin). For an API on another
  origin, set it at build time and list the app's origin in Django's `CORS_ALLOWED_ORIGINS`.

## Project structure

```
src/
  api/            endpoints.js, hooks.js (TanStack Query: queries, mutations, invalidation)
  app/            router (+ breadcrumb handles) and app-wide providers
  config.js       API base URL
  components/
    auth/         AuthLayout/AuthCard, PasswordInput, ProtectedRoute/GuestRoute
    rbac/         role badges, disabled-with-reason controls, permission gates
    reports/      Recharts charts and chart cards (lazy-loaded with /reports)
    ui/           shadcn/ui primitives restyled to TaskPilot tokens + EmptyState, NativeSelect, Alert, FormField
    layout/       Sidebar, WorkspaceSwitcher, Topbar, Breadcrumbs, GlobalSearch, UserMenu, MobileNav
    issues/       IssueTypeIcon/PriorityBadge/StatusBadge, IssueRow, IssueForm + CreateIssueDialog,
                  IssueDetail (editable fields, subtasks, attachments, comments, history), pickers
    projects/     project tile/status, cards & list rows, create-project dialog
    filters.jsx   search box, multi-select filter menu, sort menu, grid/list toggle
    notifications/, team/   lists used by Inbox and Team pages
  layouts/        AppLayout (shell around routed pages)
  lib/            Axios client (JWT + cookie refresh), session hint, API error parsing, redirects, utils
  models/         issue, project, sprint, role, report models: enums, rules, DRF mappers
  pages/          route components (auth/, onboarding/, app pages)
  services/       API calls: auth, workspace onboarding, workspace-data-service.js (everything else)
  stores/         Zustand: auth-store (session), ui-store (sidebar, drawer, active workspace)
  validation/     Zod schemas for auth, onboarding, issue and project forms
  index.css       design tokens (CSS variables) + Tailwind theme
```

## Routes

| Path                  | Page                                   |
| --------------------- | -------------------------------------- |
| `/`                   | Overview (signed in); landing page for signed-out visitors |
| `/my-tasks`           | My Tasks                               |
| `/projects`           | Projects                               |
| `/projects/:projectId` | Project overview, plus `/board`, `/backlog`, `/issues`, `/epics`, `/sprints`, `/sprints/:sprintId`, `/members` |
| `/projects/:projectId/issues/:issueKey` | Issue detail                |
| `/reports`            | Reports: status, completions, velocity, workload, overdue, epics (Recharts, lazy-loaded) |
| `/inbox`              | Inbox                                  |
| `/team`, `/team/:teamId`, `/team/members/:memberId` | Members, teams and member profiles |
| `/profile`            | Profile details and password change    |
| `/settings`, `/settings/members`, `/settings/roles` | Workspace settings, member & invitation management, role reference |
| `/design-system`      | Component reference (development builds only) |
| `/login`, `/register` | Auth (guest only)                      |
| `/reset-password/:uid/:token` | Choose a new password from the emailed link (public) |
| `/onboarding/workspace` | Create workspace (signed in)         |
| `/join`, `/invite/:token` | Join a workspace by invitation (public) |

App routes require a session (`ProtectedRoute`); auth pages redirect signed-in
users away (`GuestRoute`). After signing in, users return to `?redirect=` or the
page they were bounced from.

Breadcrumbs come from each route's `handle.crumb` in `src/app/router.jsx`.

## Data and sessions

Everything comes from the Django REST API; there is no mock or offline data.

- **Session**: the access JWT (10 min) lives in memory only. The refresh token is an
  httpOnly, SameSite cookie on `/api/auth/` that JavaScript can't read; it rotates on every
  refresh. On reload the app exchanges the cookie for a new access token; a 401 refreshes
  once and retries; a rejected refresh signs out with "Your session has expired".
- **Server state**: TanStack Query (`src/api/hooks.js`). Lists follow the API's pagination
  (`page_size` up to 200) to completion; mutations invalidate the queries they affect;
  board/backlog moves and inline edits update the cache optimistically and roll back on error.
- **States**: lists show skeletons while loading, `QueryError` with a retry button when a
  request fails (never an empty state), and empty states only when the API returned nothing.

API reference: the live OpenAPI schema at `/api/docs/` (development), plus
[`docs/auth-api.md`](docs/auth-api.md) and [`docs/workspace-api.md`](docs/workspace-api.md).

Dashboard numbers, project progress and issue counts are computed by the API from
real issues (no estimated trends). Filters live in the URL so views
can be shared; the projects grid/list preference is stored in localStorage.

Planning & collaboration:

- **Board** (dnd-kit): drag cards between To Do / In Progress / In Review / Done and within columns
  (pointer or keyboard: Space to pick up, arrows to move, Space to drop, Enter to open). `?issue=KEY`
  opens the side panel; `?scope=all` shows all issues instead of the active sprint.
- **Backlog**: sprint or epic sections (collapsible, remembered), drag-and-drop between and within
  sections, row menu (move to top/bottom/sprint), multi-select with bulk move/status/priority/assignee.
- **Sprints**: create/edit/start/complete with stats computed from issues; one active sprint per
  project, no overlapping dates. **Epics**: create/edit, progress from child issues.
- **Filters**: status, assignee, priority, type, label, sprint, epic, search and sort, all in the URL,
  shown as removable chips.
- **Comments** edit/delete per API permissions; **All / Comments / History** activity tabs.
- **Search** (`/`, Ctrl/⌘ + K): pages, projects, issues, people; server search is debounced.
- **Notifications**: bell dropdown and Inbox with categories, unread counts and read/unread toggles.

Drag-and-drop and bulk edits go through `moveIssue` / `bulkUpdateIssues`; the server validates,
authorizes, ranks and persists them (bulk edits are all-or-nothing). The UI shows the change
provisionally and rolls back on errors.

UI-only state (backlog selection, collapsed sections, grouping) lives in `src/stores/planning-store.js`;
server data stays in TanStack Query.

## Roles and access control

Roles (Owner, Admin, Project Manager, Developer, Viewer) and what each can do are
defined and **enforced by the Django API** (`../backend/docs/authorization.md`).
The UI only presents them:

- The API returns the caller's `role` / `permissions` per workspace and
  `myRole` / `permissions` per project; hooks such as `useWorkspaceAccess()` and
  `projectCan(project, PERMS.x)` read those to disable controls.
- Disabled controls explain why (`components/rbac/restricted.jsx`); dialogs for
  forbidden actions render their trigger disabled instead of opening.
- Destructive actions (removing or leaving, revoking invitations, demoting,
  making a project private) go through `ConfirmDialog`.
- `src/models/roles.js` mirrors the matrix for the role reference page. It is
  never used to grant access.

## Design system

All colors, radii and shadows are CSS variables in `src/index.css` and are exposed
as Tailwind utilities (`bg-primary`, `bg-selected`, `bg-hover`, `text-muted-foreground`,
`text-success`, `border-border`, …). Change a token once to restyle the app.

In development, visit **`/design-system`** for a live reference of every token and
component.

### Adding shadcn/ui components

```bash
npx shadcn@latest add <component>
```

`components.json` is configured for JavaScript (`"tsx": false`) and the `@/` alias.
New components use the semantic tokens automatically; adjust them to match the
existing primitives (e.g. `secondary` instead of `outline` buttons, `bg-hover` for hover).

### Keyboard & accessibility

- "Skip to main content" link on first Tab
- `/` or Ctrl/⌘ + K opens global search (arrow keys + Enter to jump)
- Visible focus rings on every interactive element (3px primary ring at 70%, ≥ 3:1 contrast)
- Dialogs, dropdowns, tooltips and the mobile drawer are Radix-based: focus trapping, Escape to close, arrow-key menus
- Collapsed sidebar icons have accessible labels + tooltips; active link uses `aria-current="page"`
- Animations respect `prefers-reduced-motion`
