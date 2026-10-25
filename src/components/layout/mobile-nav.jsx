import { useEffect } from "react"
import { useLocation } from "react-router"

import { SidebarContent } from "@/components/layout/sidebar"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useUIStore } from "@/stores/ui-store"

/**
 * Slide-in navigation drawer for screens below lg. Renders the same content as
 * the desktop sidebar; focus is trapped while open and Escape closes it.
 */
export function MobileNav() {
  const open = useUIStore((state) => state.mobileNavOpen)
  const setOpen = useUIStore((state) => state.setMobileNavOpen)
  const { pathname } = useLocation()

  // Close the drawer after navigating (covers links, workspace switches and dialogs)
  useEffect(() => {
    setOpen(false)
  }, [pathname, setOpen])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-(--sidebar-width) gap-0 p-0 sm:max-w-(--sidebar-width)">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Workspace, pages, projects and team</SheetDescription>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
