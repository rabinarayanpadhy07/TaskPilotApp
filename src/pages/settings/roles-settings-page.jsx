import { Check, Globe, Lock, Minus } from "lucide-react"

import { useWorkspaceAccess } from "@/api/hooks"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MAX_PROJECT_ROLE, PROJECT_ROLES, ROLE_CAPABILITIES, WORKSPACE_ROLES, projectRoleLabel } from "@/models/roles"

/** Reference: what each role can do. Mirrors the server's matrix; the server enforces it. */
export function RolesSettingsPage() {
  const { role: myRole } = useWorkspaceAccess()

  return (
    // min-w-0 on the sections lets wide tables scroll inside their own container
    <div className="grid grid-cols-1 gap-8 [&>section]:min-w-0">
      <section aria-labelledby="roles-overview">
        <h2 id="roles-overview" className="mb-3">
          Workspace roles
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {WORKSPACE_ROLES.map((role) => (
            <li
              key={role.value}
              className={cn("rounded-lg border bg-card p-4 shadow-xs", role.value === myRole && "border-primary/40 ring-1 ring-primary/20")}
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                {role.label}
                {role.value === myRole && <Badge variant="primary">Your role</Badge>}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="roles-matrix">
        <h2 id="roles-matrix" className="mb-3">
          Permissions by role
        </h2>
        <div className="overflow-x-auto rounded-lg border bg-card shadow-xs">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">What each workspace role can do</caption>
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Permission
                </th>
                {WORKSPACE_ROLES.map((role) => (
                  <th key={role.value} scope="col" className={cn("px-2 py-2.5 text-center font-medium", role.value === myRole && "text-primary")}>
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            {ROLE_CAPABILITIES.map((group) => (
              <tbody key={group.group} className="border-b last:border-b-0">
                <tr>
                  <th scope="rowgroup" colSpan={WORKSPACE_ROLES.length + 1} className="px-4 pt-3 pb-1 text-left text-xs font-medium text-muted-foreground">
                    {group.group}
                  </th>
                </tr>
                {group.items.map((item) => (
                  <tr key={item.label}>
                    <th scope="row" className="px-4 py-2 text-left font-normal">
                      {item.label}
                      {item.note && <span className="block text-xs text-muted-foreground">{item.note}</span>}
                    </th>
                    {WORKSPACE_ROLES.map((role) => {
                      const allowed = item.roles.includes(role.value)
                      return (
                        <td key={role.value} className="px-2 py-2 text-center">
                          {allowed ? (
                            <Check aria-label="Yes" className="mx-auto size-4 text-primary" />
                          ) : (
                            <Minus aria-label="No" className="mx-auto size-4 text-muted-foreground/50" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section aria-labelledby="roles-projects" className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <div>
          <h2 id="roles-projects" className="mb-1">
            Project access
          </h2>
          <p className="text-sm text-muted-foreground">
            Inside a project, people act as a Manager, Contributor or Viewer. Their workspace role sets the ceiling: a workspace
            Viewer stays read-only even if added to a project as a Manager.
          </p>
          <ul className="mt-4 grid gap-3 text-sm">
            <li className="flex gap-3">
              <Globe aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium">Workspace projects</span>
                <span className="text-muted-foreground">
                  {" "}
                  are open to everyone in the workspace: Developers and Project Managers contribute, Viewers read. Adding someone
                  to the project can raise their role there, e.g. make a Project Manager its manager.
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium">Private projects</span>
                <span className="text-muted-foreground"> are visible only to their members, plus workspace Owners and Admins.</span>
              </span>
            </li>
          </ul>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
          <table className="w-full text-sm">
            <caption className="sr-only">Highest project role for each workspace role</caption>
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Workspace role
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Highest project role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {WORKSPACE_ROLES.map((role) => (
                <tr key={role.value}>
                  <th scope="row" className="px-4 py-2 text-left font-normal">
                    {role.label}
                  </th>
                  <td className="px-4 py-2">
                    {projectRoleLabel(MAX_PROJECT_ROLE[role.value])}
                    <span className="text-muted-foreground"> · {PROJECT_ROLES.find((p) => p.value === MAX_PROJECT_ROLE[role.value]).description}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        These rules are enforced by the TaskPilot server on every request. Hidden or disabled buttons in the app are only a
        convenience.
      </p>
    </div>
  )
}
