import { useParams } from "react-router"

import { useProject } from "@/api/hooks"

/** The project for the current `:projectId` route param. */
export function useRouteProject() {
  const { projectId } = useParams()
  return useProject(projectId)
}
