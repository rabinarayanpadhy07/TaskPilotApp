import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

/**
 * Client-only UI state. Server data belongs in TanStack Query, not here.
 * Preferences (sidebar, selected workspace, projects view) are persisted to
 * localStorage; the mobile drawer always starts closed. Filters live in the URL.
 */
export const useUIStore = create()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

      activeWorkspaceId: null,
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

      /** Projects page layout preference: "grid" | "list" */
      projectsView: "grid",
      setProjectsView: (view) => set({ projectsView: view }),
    }),
    {
      name: "taskpilot-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeWorkspaceId: state.activeWorkspaceId,
        projectsView: state.projectsView,
      }),
    }
  )
)
