/**
 * Workspace onboarding API (real network calls to Django REST Framework).
 * Workspace *content* (projects, issues, ...) goes through src/api/data-source.js.
 */
import { endpoints } from "@/api/endpoints"
import { apiClient } from "@/lib/api-client"

function toWorkspace(data) {
  return { id: String(data.id), name: data.name, slug: data.slug }
}

function toInvitation(data) {
  return {
    workspace: toWorkspace(data.workspace),
    email: data.email,
    role: data.role,
    invitedBy: data.invited_by?.full_name || data.invited_by?.email || null,
    expiresAt: data.expires_at ?? null,
  }
}

export const workspaceService = {
  /** POST /workspaces/ → 201 workspace. The creator becomes its owner. */
  async createWorkspace({ name, slug }) {
    const { data } = await apiClient.post(endpoints.workspaces.create, { name, slug })
    return toWorkspace(data)
  },

  /** GET /invitations/:token/ → public invitation details (no auth required). */
  async getInvitation(token) {
    const { data } = await apiClient.get(endpoints.invitations.detail(token), { skipAuth: true })
    return toInvitation(data)
  },

  /** POST /invitations/:token/accept/ → the workspace joined. Requires auth. */
  async acceptInvitation(token) {
    const { data } = await apiClient.post(endpoints.invitations.accept(token))
    return toWorkspace(data.workspace ?? data)
  },
}
