/** Standard explanations, so the wording stays consistent. */
export const restrictedReasons = {
  invite: "Only owners and admins can invite people.",
  workspaceSettings: "Only owners and admins can change workspace settings.",
  manageMembers: "Only owners and admins can change roles or remove members.",
  higherRole: "You can only manage people whose role is below yours.",
  self: "You can't change your own role. Ask another owner or admin.",
  createProject: "Only owners, admins and project managers can create projects.",
  projectSettings: "Only this project's managers can change its settings.",
  projectMembers: "Only this project's managers can change who has access.",
  writeIssues: "You have read-only access to this project.",
  writeAnyProject: "You have read-only access to every project in this workspace.",
  sprints: "Only this project's managers can plan and run sprints.",
}
