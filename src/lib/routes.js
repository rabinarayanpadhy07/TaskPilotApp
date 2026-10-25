/** Canonical in-app paths, so links stay consistent everywhere. */
export const paths = {
  project: (projectId) => `/projects/${encodeURIComponent(projectId)}`,
  projectIssues: (projectId) => `/projects/${encodeURIComponent(projectId)}/issues`,
  issue: (issue) => `/projects/${encodeURIComponent(issue.projectId)}/issues/${encodeURIComponent(issue.key)}`,
}

/** Absolute URL for sharing (copy link). */
export const absoluteUrl = (path) => new URL(path, window.location.origin).toString()
