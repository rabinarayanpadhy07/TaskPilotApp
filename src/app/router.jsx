import { createBrowserRouter, Navigate } from "react-router"

import { MemberCrumb, ProjectCrumb, SprintCrumb, TeamCrumb } from "@/app/route-crumbs"
import { AuthLayout } from "@/components/auth/auth-layout"
import { GuestRoute, ProtectedRoute } from "@/components/auth/route-guards"
import { AppLayout } from "@/layouts/app-layout"
import { LoginPage } from "@/pages/auth/login-page"
import { RegisterPage } from "@/pages/auth/register-page"
import { ResetPasswordPage } from "@/pages/auth/reset-password-page"
import { InboxPage } from "@/pages/inbox-page"
import { LandingPage } from "@/pages/landing-page"
import { MemberPage } from "@/pages/member-page"
import { MyTasksPage } from "@/pages/my-tasks-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { AcceptInvitationPage } from "@/pages/onboarding/accept-invitation-page"
import { CreateWorkspacePage } from "@/pages/onboarding/create-workspace-page"
import { JoinWorkspacePage } from "@/pages/onboarding/join-workspace-page"
import { OverviewPage } from "@/pages/overview-page"
import { ProfilePage } from "@/pages/profile-page"
import { IssueDetailPage } from "@/pages/project/issue-detail-page"
import { ProjectIssuesTab } from "@/pages/project/project-issues-tab"
import { ProjectLayout, ProjectRoute } from "@/pages/project/project-layout"
import { ProjectBacklogTab } from "@/pages/project/project-backlog-tab"
import { ProjectBoardTab } from "@/pages/project/project-board-tab"
import { ProjectEpicsTab } from "@/pages/project/project-epics-tab"
import { ProjectMembersTab } from "@/pages/project/project-misc-tabs"
import { ProjectSprintsTab, SprintDetailPage } from "@/pages/project/project-sprints"
import { ProjectOverviewTab } from "@/pages/project/project-overview-tab"
import { ProjectsPage } from "@/pages/projects-page"
import { RouteErrorPage } from "@/pages/route-error-page"
import { GeneralSettingsPage } from "@/pages/settings/general-settings-page"
import { MembersSettingsPage } from "@/pages/settings/members-settings-page"
import { RolesSettingsPage } from "@/pages/settings/roles-settings-page"
import { SettingsLayout } from "@/pages/settings/settings-layout"
import { TeamDetailPage } from "@/pages/team-detail-page"
import { TeamPage } from "@/pages/team-page"

/**
 * Route map
 * - Guest only (signed-in users are redirected away): /login, /register
 * - Public: /join, /invite/:token, /reset-password/:uid/:token
 * - Protected (signed in, or the dev-only UI preview): onboarding + the app shell;
 *   guests opening / see the landing page instead of being sent to /login
 *
 * `handle.crumb` feeds the top-bar breadcrumbs: a string, or a function of the
 * route match returning a label. Routes without a crumb are skipped.
 */
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: "login", element: <LoginPage /> },
              { path: "register", element: <RegisterPage /> },
            ],
          },
        ],
      },

      {
        element: <AuthLayout />,
        children: [
          { path: "join", element: <JoinWorkspacePage /> },
          { path: "invite/:token", element: <AcceptInvitationPage /> },
          { path: "reset-password/:uid/:token", element: <ResetPasswordPage /> },
        ],
      },

      {
        element: <ProtectedRoute guestHome={<LandingPage />} />,
        children: [
          {
            element: <AuthLayout />,
            children: [{ path: "onboarding/workspace", element: <CreateWorkspacePage /> }],
          },
          {
            path: "/",
            element: <AppLayout />,
            // Shown for a moment when the first page load hits a lazy route
            hydrateFallbackElement: <div className="min-h-dvh bg-background" />,
            children: [
              { index: true, element: <OverviewPage />, handle: { crumb: "Overview" } },
              { path: "my-tasks", element: <MyTasksPage />, handle: { crumb: "My Tasks" } },
              {
                path: "projects",
                handle: { crumb: "Projects" },
                children: [
                  { index: true, element: <ProjectsPage /> },
                  {
                    path: ":projectId",
                    element: <ProjectRoute />,
                    handle: { crumb: (match) => <ProjectCrumb projectId={match.params.projectId} /> },
                    children: [
                      {
                        element: <ProjectLayout />,
                        children: [
                          { index: true, element: <ProjectOverviewTab /> },
                          { path: "board", element: <ProjectBoardTab />, handle: { crumb: "Board" } },
                          { path: "backlog", element: <ProjectBacklogTab />, handle: { crumb: "Backlog" } },
                          { path: "epics", element: <ProjectEpicsTab />, handle: { crumb: "Epics" } },
                          { path: "members", element: <ProjectMembersTab />, handle: { crumb: "Members" } },
                        ],
                      },
                      {
                        path: "sprints",
                        handle: { crumb: "Sprints" },
                        children: [
                          { element: <ProjectLayout />, children: [{ index: true, element: <ProjectSprintsTab /> }] },
                          { path: ":sprintId", element: <SprintDetailPage />, handle: { crumb: (match) => <SprintCrumb projectId={match.params.projectId} sprintId={match.params.sprintId} /> } },
                        ],
                      },
                      {
                        path: "issues",
                        handle: { crumb: "Issues" },
                        children: [
                          { element: <ProjectLayout />, children: [{ index: true, element: <ProjectIssuesTab /> }] },
                          { path: ":issueKey", element: <IssueDetailPage />, handle: { crumb: (match) => match.params.issueKey } },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                // Code-split: Recharts is only downloaded when Reports is opened
                path: "reports",
                handle: { crumb: "Reports" },
                lazy: async () => {
                  const { ReportsPage } = await import("@/pages/reports-page")
                  return { Component: ReportsPage }
                },
              },
              { path: "inbox", element: <InboxPage />, handle: { crumb: "Inbox" } },
              {
                path: "team",
                handle: { crumb: "Team" },
                children: [
                  { index: true, element: <TeamPage /> },
                  {
                    path: "members/:memberId",
                    element: <MemberPage />,
                    handle: { crumb: (match) => <MemberCrumb memberId={match.params.memberId} /> },
                  },
                  {
                    path: ":teamId",
                    element: <TeamDetailPage />,
                    handle: { crumb: (match) => <TeamCrumb teamId={match.params.teamId} /> },
                  },
                ],
              },
              { path: "profile", element: <ProfilePage />, handle: { crumb: "Profile" } },
              {
                path: "settings",
                element: <SettingsLayout />,
                handle: { crumb: "Settings" },
                children: [
                  { index: true, element: <GeneralSettingsPage /> },
                  { path: "members", element: <MembersSettingsPage />, handle: { crumb: "Members" } },
                  { path: "roles", element: <RolesSettingsPage />, handle: { crumb: "Roles & permissions" } },
                ],
              },
              // Old placeholder URL from the previous step
              { path: "workspaces/new", element: <Navigate to="/onboarding/workspace" replace /> },
              // Component reference: development builds only (not routable in production)
              ...(import.meta.env.DEV
                ? [
                    {
                      path: "design-system",
                      handle: { crumb: "Design system" },
                      lazy: async () => {
                        const { DesignSystemPage } = await import("@/pages/design-system-page")
                        return { Component: DesignSystemPage }
                      },
                    },
                  ]
                : []),
              { path: "*", element: <NotFoundPage />, handle: { crumb: "Not found" } },
            ],
          },
        ],
      },
    ],
  },
])
