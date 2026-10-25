import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

/**
 * UI-only state for the board and backlog. Server data (issues, sprints)
 * lives in TanStack Query; this store never holds copies of it.
 *
 * - selectedKeys: backlog multi-selection for bulk actions (not persisted)
 * - collapsed: which backlog sections are collapsed, keyed "<projectId>:<sectionId>" (persisted)
 * - backlogGroupBy: "sprint" | "epic" (persisted)
 */
export const usePlanningStore = create()(
  persist(
    (set) => ({
      selectedKeys: [],
      toggleSelected: (key) =>
        set((state) => ({
          selectedKeys: state.selectedKeys.includes(key)
            ? state.selectedKeys.filter((k) => k !== key)
            : [...state.selectedKeys, key],
        })),
      setSelected: (keys) => set({ selectedKeys: keys }),
      clearSelection: () => set({ selectedKeys: [] }),

      collapsed: {},
      toggleCollapsed: (id) => set((state) => ({ collapsed: { ...state.collapsed, [id]: !state.collapsed[id] } })),

      backlogGroupBy: "sprint",
      setBacklogGroupBy: (groupBy) => set({ backlogGroupBy: groupBy }),
    }),
    {
      name: "taskpilot-planning",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ collapsed: state.collapsed, backlogGroupBy: state.backlogGroupBy }),
    }
  )
)
