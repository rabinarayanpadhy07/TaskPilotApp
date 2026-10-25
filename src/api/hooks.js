/**
 * TanStack Query hooks for workspace content. Components use only these; the
 * data comes from the Django REST API (src/services/workspace-data-service.js).
 */
import { keepPreviousData, useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query"

import { workspaceDataService as dataSource } from "@/services/workspace-data-service"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"

/** Centralized query keys so invalidation stays consistent. */
export const queryKeys = {
  currentUser: ["me"],
  currentMember: ["member-me"],
  workspaces: ["workspaces"],
  members: (ws) => ["workspaces", ws, "members"],
  invitations: (ws) => ["workspaces", ws, "invitations"],
  projectMembersRoot: (ws) => ["workspaces", ws, "project-members"],
  projectMembers: (ws, projectId) => ["workspaces", ws, "project-members", projectId],
  reportsRoot: (ws) => ["workspaces", ws, "reports"],
  report: (ws, params) => ["workspaces", ws, "reports", params],
  projects: (ws) => ["workspaces", ws, "projects"],
  teams: (ws) => ["workspaces", ws, "teams"],
  labels: (ws) => ["workspaces", ws, "labels"],
  notifications: (ws) => ["workspaces", ws, "notifications"],
  workspaceActivity: (ws) => ["workspaces", ws, "activity"],
  issuesRoot: (ws) => ["workspaces", ws, "issues"],
  issues: (ws, params = {}) => ["workspaces", ws, "issues", params],
  issue: (ws, key) => ["workspaces", ws, "issue", key],
  comments: (ws, key) => ["workspaces", ws, "issue", key, "comments"],
  issueActivity: (ws, key) => ["workspaces", ws, "issue", key, "activity"],
  attachments: (ws, key) => ["workspaces", ws, "issue", key, "attachments"],
  sprintsRoot: (ws) => ["workspaces", ws, "sprints"],
  sprints: (ws, projectId) => ["workspaces", ws, "sprints", projectId],
  search: (ws, query) => ["workspaces", ws, "search", query],
}

// ---------- Session & workspace ----------

/** The signed-in user (from the auth store). */
export function useCurrentUser() {
  const user = useAuthStore((state) => state.user)
  return { data: user, isPending: !user }
}

/** The signed-in user as a workspace member ("assigned to me"). Same person as useCurrentUser. */
export function useCurrentMember() {
  return useCurrentUser()
}

export function useWorkspaces() {
  return useQuery({ queryKey: queryKeys.workspaces, queryFn: () => dataSource.getWorkspaces() })
}

/**
 * The workspace the user is currently working in. The selected id is client
 * state (persisted in Zustand); falls back to the first workspace.
 */
export function useActiveWorkspace() {
  const activeWorkspaceId = useUIStore((state) => state.activeWorkspaceId)
  const { data: workspaces = [], isPending } = useWorkspaces()
  const workspace = workspaces.find((ws) => ws.id === activeWorkspaceId) ?? workspaces[0] ?? null
  return { workspace, workspaces, isPending }
}

function useWorkspaceId() {
  return useActiveWorkspace().workspace?.id
}

/**
 * The caller's role and permissions in the active workspace, as returned by
 * the API. For showing/disabling controls only: the API authorizes every request.
 */
export function useWorkspaceAccess() {
  const { workspace, isPending } = useActiveWorkspace()
  const permissions = workspace?.permissions ?? []
  return {
    role: workspace?.role ?? null,
    permissions,
    assignableRoles: workspace?.assignableRoles ?? [],
    can: (perm) => permissions.includes(perm),
    isPending,
  }
}

function useWorkspaceQuery(keyFn, fetcher, { enabled = true, ...options } = {}) {
  const workspaceId = useWorkspaceId()
  return useQuery({
    queryKey: keyFn(workspaceId),
    queryFn: () => fetcher(workspaceId),
    enabled: Boolean(workspaceId) && enabled,
    ...options,
  })
}

export function useMembers() {
  return useWorkspaceQuery(queryKeys.members, (ws) => dataSource.getMembers(ws))
}

/** Members keyed by id, for resolving `assigneeId`, `memberIds`, ... */
export function useMemberMap() {
  const { data = [] } = useMembers()
  return Object.fromEntries(data.map((member) => [member.id, member]))
}

export function useTeams() {
  return useWorkspaceQuery(queryKeys.teams, (ws) => dataSource.getTeams(ws))
}

export function useTeam(teamId) {
  const query = useTeams()
  return { ...query, data: query.data?.find((team) => team.id === teamId) }
}

/**
 * Notifications. With the real API they are polled every 30 s (and on window
 * focus); sample data never produces new notifications on its own.
 */
export function useNotifications() {
  return useWorkspaceQuery(queryKeys.notifications, (ws) => dataSource.getNotifications(ws), {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useUnreadCount() {
  const { data = [] } = useNotifications()
  return data.filter((n) => !n.read).length
}

export function useWorkspaceActivity({ limit = 20 } = {}) {
  return useWorkspaceQuery((ws) => [...queryKeys.workspaceActivity(ws), limit], (ws) => dataSource.getWorkspaceActivity(ws, { limit }))
}

// ---------- Projects ----------

export function useProjects() {
  return useWorkspaceQuery(queryKeys.projects, (ws) => dataSource.getProjects(ws))
}

export function useProject(projectId) {
  const query = useProjects()
  return { ...query, data: query.data?.find((project) => project.id === projectId) }
}

// ---------- Issues ----------

export function useLabels() {
  return useWorkspaceQuery(queryKeys.labels, (ws) => dataSource.getLabels(ws))
}

/** Issues filtered server-side by `projectId` and/or `assigneeId`. */
export function useIssues(params = {}, options = {}) {
  const workspaceId = useWorkspaceId()
  const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value != null))
  return useQuery({
    queryKey: queryKeys.issues(workspaceId, clean),
    queryFn: () => dataSource.getIssues(workspaceId, clean),
    enabled: Boolean(workspaceId) && (options.enabled ?? true),
  })
}

/** Open and done issues assigned to the current member. */
export function useMyIssues() {
  const { data: me } = useCurrentMember()
  const query = useIssues({ assigneeId: me?.id }, { enabled: Boolean(me) })
  return { ...query, isPending: !me || query.isPending }
}

/** One issue; shows a cached copy from any issue list instantly while loading. */
export function useIssue(key) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  return useQuery({
    queryKey: queryKeys.issue(workspaceId, key),
    queryFn: () => dataSource.getIssue(workspaceId, key),
    enabled: Boolean(workspaceId && key),
    retry: (count, error) => error?.response?.status !== 404 && count < 1,
    placeholderData: () =>
      queryClient
        .getQueriesData({ queryKey: queryKeys.issuesRoot(workspaceId) })
        .flatMap(([, list]) => list ?? [])
        .find((issue) => issue.key === key),
  })
}

function invalidate(queryClient, keys) {
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export function useCreateIssue() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  return useMutation({
    mutationFn: (values) => dataSource.createIssue(workspaceId, values),
    onSuccess: () =>
      invalidate(queryClient, [
        queryKeys.issuesRoot(workspaceId),
        queryKeys.projects(workspaceId),
        queryKeys.labels(workspaceId),
        queryKeys.workspaceActivity(workspaceId),
      ]),
  })
}

/**
 * Patches an issue optimistically. If the request fails, every cached copy is
 * rolled back and the error is available to the caller / useIssueSaveState.
 */
export function useUpdateIssue(key) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  const issueKey = queryKeys.issue(workspaceId, key)
  const listsKey = queryKeys.issuesRoot(workspaceId)

  return useMutation({
    mutationKey: ["issue-save", workspaceId, key],
    mutationFn: (patch) => dataSource.updateIssue(workspaceId, key, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: issueKey })
      await queryClient.cancelQueries({ queryKey: listsKey })
      const previousIssue = queryClient.getQueryData(issueKey)
      const previousLists = queryClient.getQueriesData({ queryKey: listsKey })
      const apply = (issue) => (issue?.key === key ? { ...issue, ...patch } : issue)
      queryClient.setQueryData(issueKey, apply)
      queryClient.setQueriesData({ queryKey: listsKey }, (list) => (Array.isArray(list) ? list.map(apply) : list))
      return { previousIssue, previousLists }
    },
    onError: (_error, _patch, context) => {
      if (!context) return
      queryClient.setQueryData(issueKey, context.previousIssue)
      for (const [queryKey, data] of context.previousLists) queryClient.setQueryData(queryKey, data)
    },
    onSuccess: (issue) => queryClient.setQueryData(issueKey, issue),
    onSettled: () =>
      invalidate(queryClient, [
        listsKey,
        queryKeys.projects(workspaceId),
        queryKeys.labels(workspaceId),
        queryKeys.issueActivity(workspaceId, key),
        queryKeys.workspaceActivity(workspaceId),
      ]),
  })
}

/** Latest save state for an issue: "idle" | "pending" | "success" | "error". */
export function useIssueSaveState(key) {
  const workspaceId = useWorkspaceId()
  const states = useMutationState({
    filters: { mutationKey: ["issue-save", workspaceId, key] },
    select: (mutation) => ({ status: mutation.state.status, error: mutation.state.error }),
  })
  return states.at(-1) ?? { status: "idle", error: null }
}

// ---------- Comments, activity, attachments ----------

export function useComments(key) {
  const workspaceId = useWorkspaceId()
  return useQuery({
    queryKey: queryKeys.comments(workspaceId, key),
    queryFn: () => dataSource.getComments(workspaceId, key),
    enabled: Boolean(workspaceId && key),
  })
}

function useIssueChildMutation(key, mutationFn, keysToInvalidate) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  return useMutation({
    mutationFn: (variables) => mutationFn(workspaceId, key, variables),
    onSuccess: () =>
      invalidate(
        queryClient,
        [...keysToInvalidate, queryKeys.issueActivity, queryKeys.issue].map((keyFn) => keyFn(workspaceId, key))
      ),
  })
}

export function useAddComment(key) {
  return useIssueChildMutation(key, (ws, k, values) => dataSource.addComment(ws, k, values), [queryKeys.comments])
}

/** Variables: { id, body } */
export function useEditComment(key) {
  return useIssueChildMutation(key, (ws, k, { id, body }) => dataSource.editComment(ws, k, id, { body }), [queryKeys.comments])
}

export function useDeleteComment(key) {
  return useIssueChildMutation(key, (ws, k, id) => dataSource.deleteComment(ws, k, id), [queryKeys.comments])
}

export function useIssueActivity(key) {
  const workspaceId = useWorkspaceId()
  return useQuery({
    queryKey: queryKeys.issueActivity(workspaceId, key),
    queryFn: () => dataSource.getIssueActivity(workspaceId, key),
    enabled: Boolean(workspaceId && key),
  })
}

export function useAttachments(key) {
  const workspaceId = useWorkspaceId()
  return useQuery({
    queryKey: queryKeys.attachments(workspaceId, key),
    queryFn: () => dataSource.getAttachments(workspaceId, key),
    enabled: Boolean(workspaceId && key),
    // Download links are signed for 15 minutes; keep them fresh while the issue is open
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: true,
  })
}

/** Variables: { file, onProgress } */
export function useUploadAttachment(key) {
  return useIssueChildMutation(
    key,
    (ws, k, { file, onProgress }) => dataSource.uploadAttachment(ws, k, file, { onProgress }),
    [queryKeys.attachments]
  )
}

export function useDeleteAttachment(key) {
  return useIssueChildMutation(key, (ws, k, id) => dataSource.deleteAttachment(ws, k, id), [queryKeys.attachments])
}

// ---------- Other mutations ----------

function useWorkspaceMutation(mutationFn, invalidateKeys) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  return useMutation({
    mutationFn: (variables) => mutationFn(workspaceId, variables),
    onSuccess: () => invalidate(queryClient, invalidateKeys.map((keyFn) => keyFn(workspaceId))),
  })
}

export function useCreateProject() {
  return useWorkspaceMutation((ws, values) => dataSource.createProject(ws, values), [queryKeys.projects])
}

/** Optimistically flips read state; rolls back if the request fails. */
function useNotificationMutation(mutationFn, apply) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  const key = queryKeys.notifications(workspaceId)
  return useMutation({
    mutationFn: (variables) => mutationFn(workspaceId, variables),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      queryClient.setQueryData(key, (list) => list?.map((n) => apply(n, variables)))
      return { previous }
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

/** Pass an array of ids, or nothing to mark everything as read. */
export function useMarkNotificationsRead() {
  return useNotificationMutation(
    (ws, ids) => dataSource.markNotificationsRead(ws, ids),
    (n, ids) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)
  )
}

export function useMarkNotificationUnread() {
  return useNotificationMutation(
    (ws, id) => dataSource.markNotificationUnread(ws, id),
    (n, id) => (n.id === id ? { ...n, read: false } : n)
  )
}

// ---------- Search ----------

/**
 * Server-side search for projects, issues and people. Requests are debounced
 * (250 ms) and need at least 2 characters; previous results stay visible while
 * the next ones load.
 */
export function useWorkspaceSearch(query) {
  const workspaceId = useWorkspaceId()
  const debounced = useDebouncedValue(query.trim(), 250)
  const result = useQuery({
    queryKey: queryKeys.search(workspaceId, debounced),
    queryFn: () => dataSource.search(workspaceId, debounced),
    enabled: Boolean(workspaceId) && debounced.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })
  return { ...result, isDebouncing: query.trim() !== debounced }
}

// ---------- Sprints ----------

export function useSprints(projectId) {
  const workspaceId = useWorkspaceId()
  return useQuery({
    queryKey: queryKeys.sprints(workspaceId, projectId),
    queryFn: () => dataSource.getSprints(workspaceId, projectId),
    enabled: Boolean(workspaceId && projectId),
  })
}

/** Sprint changes affect issues (completing moves them) and project counts. */
function useSprintMutation(mutationFn) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  return useMutation({
    mutationFn: (variables) => mutationFn(workspaceId, variables),
    onSuccess: () =>
      invalidate(queryClient, [queryKeys.sprintsRoot(workspaceId), queryKeys.issuesRoot(workspaceId), queryKeys.projects(workspaceId)]),
  })
}

export const useCreateSprint = (projectId) => useSprintMutation((ws, values) => dataSource.createSprint(ws, projectId, values))
export const useUpdateSprint = () => useSprintMutation((ws, { id, ...values }) => dataSource.updateSprint(ws, id, values))
export const useStartSprint = () => useSprintMutation((ws, { id, ...values }) => dataSource.startSprint(ws, id, values))
export const useCompleteSprint = () => useSprintMutation((ws, { id, ...values }) => dataSource.completeSprint(ws, id, values))

// ---------- Planning: drag-and-drop moves and bulk edits ----------

/**
 * Moves an issue (status / sprint / epic + position). The cache is updated
 * immediately with a provisional rank so the drop feels instant; the server
 * response is authoritative and any failure rolls the lists back.
 *
 * Variables: { key, status?, sprintId?, parentId?, beforeKey, afterKey, rank }
 */
export function useMoveIssue() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  const listsKey = queryKeys.issuesRoot(workspaceId)

  return useMutation({
    mutationFn: ({ key, rank: _rank, ...move }) => dataSource.moveIssue(workspaceId, key, move),
    onMutate: async ({ key, status, sprintId, parentId, rank }) => {
      await queryClient.cancelQueries({ queryKey: listsKey })
      const previousLists = queryClient.getQueriesData({ queryKey: listsKey })
      const patch = Object.fromEntries(Object.entries({ status, sprintId, parentId, rank }).filter(([, v]) => v !== undefined))
      queryClient.setQueriesData({ queryKey: listsKey }, (list) =>
        Array.isArray(list) ? list.map((issue) => (issue.key === key ? { ...issue, ...patch } : issue)) : list
      )
      return { previousLists }
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, data] of context?.previousLists ?? []) queryClient.setQueryData(queryKey, data)
    },
    onSettled: (_data, _error, { key }) =>
      invalidate(queryClient, [
        listsKey,
        queryKeys.sprintsRoot(workspaceId),
        queryKeys.projects(workspaceId),
        queryKeys.issue(workspaceId, key),
        queryKeys.issueActivity(workspaceId, key),
        queryKeys.workspaceActivity(workspaceId),
      ]),
  })
}

/** Variables: { keys: string[], changes: { status?, sprintId?, assigneeId?, priority? } } */
export function useBulkUpdateIssues() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  return useMutation({
    mutationFn: ({ keys, changes }) => dataSource.bulkUpdateIssues(workspaceId, keys, changes),
    onSuccess: () =>
      invalidate(queryClient, [
        queryKeys.issuesRoot(workspaceId),
        queryKeys.sprintsRoot(workspaceId),
        queryKeys.projects(workspaceId),
        queryKeys.workspaceActivity(workspaceId),
      ]),
  })
}

// ---------- Access management ----------

/**
 * Role or membership changes can change what the caller may see anywhere, so
 * everything in the workspace is refetched afterwards.
 */
function useAccessMutation(mutationFn) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  return useMutation({
    mutationFn: (variables) => mutationFn(workspaceId, variables),
    // ["workspaces"] prefixes every workspace-scoped query key
    onSuccess: () => invalidate(queryClient, [queryKeys.workspaces, queryKeys.currentMember]),
  })
}

/** Variables: { name, slug } */
export const useUpdateWorkspace = () => useAccessMutation((ws, values) => dataSource.updateWorkspace(ws, values))

/** Variables: { userId, role } */
export const useUpdateMemberRole = () => useAccessMutation((ws, { userId, role }) => dataSource.updateMemberRole(ws, userId, role))

/** Variables: userId (the caller's own id = leave the workspace) */
export const useRemoveMember = () => useAccessMutation((ws, userId) => dataSource.removeMember(ws, userId))

export function useInvitations({ enabled = true } = {}) {
  return useWorkspaceQuery(queryKeys.invitations, (ws) => dataSource.getInvitations(ws), { enabled })
}

/** Variables: { email, role }. Resolves with the invitation, including a one-time `inviteUrl`. */
export const useCreateInvitation = () =>
  useWorkspaceMutation((ws, values) => dataSource.createInvitation(ws, values), [queryKeys.invitations])

export const useRevokeInvitation = () =>
  useWorkspaceMutation((ws, id) => dataSource.revokeInvitation(ws, id), [queryKeys.invitations])

// ---------- Project access ----------

export function useProjectMembers(projectId) {
  const workspaceId = useWorkspaceId()
  return useQuery({
    queryKey: queryKeys.projectMembers(workspaceId, projectId),
    queryFn: () => dataSource.getProjectMembers(workspaceId, projectId),
    enabled: Boolean(workspaceId && projectId),
  })
}

function useProjectAccessMutation(projectId, mutationFn) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  return useMutation({
    mutationFn: (variables) => mutationFn(workspaceId, projectId, variables),
    onSuccess: () =>
      invalidate(queryClient, [
        queryKeys.projectMembers(workspaceId, projectId),
        queryKeys.projects(workspaceId),
        queryKeys.issuesRoot(workspaceId),
        queryKeys.reportsRoot(workspaceId),
      ]),
  })
}

/** Variables: { userId, role } */
export const useAddProjectMember = (projectId) =>
  useProjectAccessMutation(projectId, (ws, id, values) => dataSource.addProjectMember(ws, id, values))

/** Variables: { userId, role } */
export const useUpdateProjectMember = (projectId) =>
  useProjectAccessMutation(projectId, (ws, id, { userId, role }) => dataSource.updateProjectMember(ws, id, userId, { role }))

/** Variables: userId */
export const useRemoveProjectMember = (projectId) =>
  useProjectAccessMutation(projectId, (ws, id, userId) => dataSource.removeProjectMember(ws, id, userId))

/** Variables: partial project ({ visibility }, { name }, ...) */
export const useUpdateProject = (projectId) =>
  useProjectAccessMutation(projectId, (ws, id, patch) => dataSource.updateProject(ws, id, patch))

// ---------- Reports ----------

/** Server-aggregated report; keeps the previous result visible while filters change. */
export function useReport({ projectId, from, to }) {
  const workspaceId = useWorkspaceId()
  const params = { projectId: projectId || null, from, to }
  return useQuery({
    queryKey: queryKeys.report(workspaceId, params),
    queryFn: () => dataSource.getReport(workspaceId, params),
    enabled: Boolean(workspaceId && from && to),
    placeholderData: keepPreviousData,
    retry: (count, error) => ![400, 403, 404].includes(error?.response?.status) && count < 1,
  })
}
