import { useEffect, useId, useMemo, useRef, useState } from "react"
import { CornerDownLeft, Loader2, Search } from "lucide-react"
import { useNavigate } from "react-router"

import { useProjects, useTeams, useWorkspaceSearch } from "@/api/hooks"
import { IssueTypeIcon } from "@/components/issues/issue-badges"
import { searchablePages } from "@/components/layout/navigation"
import { ProjectTile } from "@/components/projects/project-tile"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { paths } from "@/lib/routes"
import { cn } from "@/lib/utils"

const EMPTY_RESULTS = { projects: [], issues: [], members: [] }

function isEditableTarget(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  )
}

/**
 * Results grouped for display. Pages and teams match instantly on the client;
 * projects, issues and people come from the server search endpoint
 * (debounced, 2+ characters). With an empty query, pages and projects are listed.
 */
function useSearchGroups(query) {
  const { data: projects = [] } = useProjects()
  const { data: teams = [] } = useTeams()
  const search = useWorkspaceSearch(query)
  const remote = search.data ?? EMPTY_RESULTS

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (...fields) => !q || fields.some((field) => field.toLowerCase().includes(q))
    const searching = q.length >= 2
    const projectItem = (project) => ({ id: `project-${project.id}`, label: project.name, hint: project.key, to: paths.project(project.id), tile: project.key })

    return [
      {
        heading: "Pages",
        items: searchablePages
          .filter((page) => matches(page.label))
          .map((page) => ({ id: `page-${page.to}`, label: page.label, to: page.to, icon: page.icon })),
      },
      { heading: "Projects", items: searching ? remote.projects.map(projectItem) : q ? [] : projects.map(projectItem) },
      {
        heading: "Issues",
        items: searching
          ? remote.issues.map((issue) => ({ id: `issue-${issue.id}`, label: issue.title, hint: issue.key, to: paths.issue(issue), issueType: issue.type }))
          : [],
      },
      {
        heading: "People",
        items: searching
          ? remote.members.map((member) => ({ id: `member-${member.id}`, label: member.name, hint: member.title, to: `/team/members/${member.id}`, avatar: member.name }))
          : [],
      },
      {
        heading: "Teams",
        items: teams
          .filter((team) => matches(team.name))
          .map((team) => ({ id: `team-${team.id}`, label: team.name, to: `/team/${team.id}`, tile: team.name, round: true })),
      },
    ].filter((group) => group.items.length > 0)
  }, [query, projects, teams, remote])

  return { groups, loading: query.trim().length >= 2 && (search.isDebouncing || search.isFetching), error: search.isError }
}

function SearchDialog({ open, onOpenChange }) {
  const navigate = useNavigate()
  const listboxId = useId()
  const listRef = useRef(null)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  // Enter pressed before debounced results arrived: open the top result once they do
  const [pendingEnter, setPendingEnter] = useState(false)

  const { groups, loading, error } = useSearchGroups(query)
  const items = groups.flatMap((group) => group.items)
  const activeItem = items[Math.min(activeIndex, items.length - 1)]

  // Keep the highlighted option visible while navigating with arrow keys
  useEffect(() => {
    if (!activeItem) return
    listRef.current
      ?.querySelector(`[data-option-id="${activeItem.id}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [activeItem])

  function handleOpenChange(next) {
    onOpenChange(next)
    if (!next) {
      setQuery("")
      setActiveIndex(0)
      setPendingEnter(false)
    }
  }

  function go(item) {
    handleOpenChange(false)
    navigate(item.to)
  }

  useEffect(() => {
    if (!pendingEnter || loading) return
    setPendingEnter(false)
    if (activeItem) go(activeItem)
    // go() only navigates and closes; it doesn't need to be a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEnter, loading, activeItem])

  function handleKeyDown(event) {
    if (event.key === "Enter" && loading) {
      event.preventDefault()
      setPendingEnter(true)
      return
    }
    if (items.length === 0) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % items.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + items.length) % items.length)
    } else if (event.key === "Enter" && activeItem) {
      event.preventDefault()
      go(activeItem)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search issues, projects, people, pages and teams. Use the arrow keys to move and Enter to open.
        </DialogDescription>

        <div className="flex h-12 items-center gap-3 border-b px-4">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <input
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={activeItem?.id}
            aria-autocomplete="list"
            aria-label="Search"
            autoComplete="off"
            spellCheck="false"
            placeholder="Search issues, projects, people…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 aria-label="Searching" className="size-4 animate-spin text-muted-foreground" />}
          <kbd className="hidden h-5 items-center rounded-sm border bg-muted px-1.5 text-[11px] font-medium text-muted-foreground sm:flex">
            Esc
          </kbd>
        </div>

        <div ref={listRef} id={listboxId} role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
          {groups.map((group) => (
            <div key={group.heading} role="group" aria-label={group.heading} className="mb-1 last:mb-0">
              <div aria-hidden="true" className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                {group.heading}
              </div>
              {group.items.map((item) => {
                const isActive = item.id === activeItem?.id
                const Icon = item.icon
                return (
                  <div
                    key={item.id}
                    id={item.id}
                    data-option-id={item.id}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => go(item)}
                    onMouseMove={() => setActiveIndex(items.indexOf(item))}
                    className={cn(
                      "flex h-9 cursor-pointer items-center gap-3 rounded-md px-2 text-sm",
                      isActive ? "bg-hover text-foreground" : "text-foreground"
                    )}
                  >
                    {Icon ? (
                      <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                    ) : item.issueType ? (
                      <IssueTypeIcon type={item.issueType} />
                    ) : item.avatar ? (
                      <UserAvatar name={item.avatar} size="sm" className="size-5 text-[9px]" />
                    ) : (
                      <ProjectTile label={item.tile} size="sm" className={item.round && "rounded-full"} />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.hint && <span className="font-mono text-xs text-muted-foreground">{item.hint}</span>}
                    {isActive && <CornerDownLeft aria-hidden="true" className="size-3.5 text-muted-foreground" />}
                  </div>
                )
              })}
            </div>
          ))}
          {items.length === 0 && !loading && (
            <p role="status" className="px-2 py-8 text-center text-sm text-muted-foreground">
              {error ? "Search is unavailable right now. Try again in a moment." : `No results for “${query}”`}
            </p>
          )}
        </div>

        <div className="hidden items-center gap-4 border-t px-4 py-2 text-xs text-muted-foreground sm:flex">
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
          <span className="ml-auto">Type 2+ characters to search issues and people</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Search trigger for the top bar: an input-like button on md+ and an icon
 * button below. Opens with "/" or Ctrl/⌘ + K from anywhere.
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event) {
      const isModK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      const isSlash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey
      if (isModK || (isSlash && !isEditableTarget(event.target))) {
        event.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        aria-keyshortcuts="/ Control+K Meta+K"
        className="focus-ring hidden h-9 w-56 cursor-pointer items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-hover md:flex lg:w-64 xl:w-72"
      >
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search…</span>
        <kbd
          aria-hidden="true"
          className="flex h-5 items-center rounded-sm border bg-muted px-1.5 font-sans text-[11px] font-medium"
        >
          /
        </kbd>
      </button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        className="text-muted-foreground hover:text-foreground md:hidden"
        onClick={() => setOpen(true)}
      >
        <Search />
      </Button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
