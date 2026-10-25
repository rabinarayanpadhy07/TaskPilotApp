import { useEffect } from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { queryClient } from "@/lib/query-client"
import { useAuthStore } from "@/stores/auth-store"

export function AppProviders({ children }) {
  // Restore a stored session (no-op when there is none)
  useEffect(() => {
    useAuthStore.getState().initialize()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
