import { useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowDownToLine, ArrowUpToLine, ChevronRight, GripVertical, MoreHorizontal, Plus, Zap } from "lucide-react"

import { IssueTypeIcon, PriorityIcon, StatusBadge } from "@/components/issues/issue-badges"
import { CreateIssueDialog } from "@/components/issues/issue-form"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/user-avatar"
import { createContainerCollision } from "@/components/board/collision"
import { cn } from "@/lib/utils"
import { byRank, rankBetween } from "@/models/rank"
import { usePlanningStore } from "@/stores/planning-store"

const SECTION_PREFIX = "section:"

const collisionDetection = createContainerCollision(SECTION_PREFIX)

function containerOf(sections, id) {
  if (typeof id === "string" && id.startsWith(SECTION_PREFIX)) return id.slice(SECTION_PREFIX.length)
  return Object.keys(sections).find((section) => sections[section].includes(id))
}

/** Checkbox that supports the "some selected" state. */
function TriStateCheckbox({ checked, indeterminate, onChange, label }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      className="size-4 shrink-0 cursor-pointer rounded-sm accent-primary"
    />
  )
}

function RowBody({ issue, assignee, epic, showEpic }) {
  return (
    <>
      <IssueTypeIcon type={issue.type} label />
      <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{issue.key}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{issue.title}</span>
      {showEpic && epic && (
        <span className="hidden max-w-40 shrink-0 items-center gap-1 truncate rounded-sm bg-primary/8 px-1.5 py-px text-[11px] font-medium text-primary md:inline-flex">
          <Zap aria-hidden="true" className="size-3" />
          <span className="truncate">{epic.title}</span>
        </span>
      )}
      <StatusBadge status={issue.status} className="hidden sm:inline-flex" />
      <span className="hidden w-6 text-center text-xs font-semibold tabular-nums text-muted-foreground sm:inline-block" title="Story points">
        {issue.storyPoints ?? "–"}
        <span className="sr-only"> story points</span>
      </span>
      <PriorityIcon priority={issue.priority} label className="hidden sm:block" />
      {assignee ? (
        <UserAvatar name={assignee.name} size="sm" title={assignee.name} />
      ) : (
        <span role="img" aria-label="Unassigned" className="size-6 shrink-0 rounded-full border border-dashed border-input" />
      )}
    </>
  )
}

function BacklogRow({ issue, assignee, epic, showEpic, selected, onToggle, onOpen, isOpen, moveTargets, onQuickMove }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: issue.key })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-2.5 border-b bg-card py-1.5 pr-2 pl-1 last:border-b-0 sm:pr-3",
        selected && "bg-selected/70",
        isOpen && "shadow-[inset_3px_0_0_var(--primary)]",
        isDragging && "relative z-10 opacity-50"
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${issue.key}`}
        className="focus-ring flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground/60 hover:bg-hover hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <input
        type="checkbox"
        aria-label={`Select ${issue.key}`}
        checked={selected}
        onChange={() => onToggle(issue.key)}
        className="size-4 shrink-0 cursor-pointer rounded-sm accent-primary"
      />
      <button
        type="button"
        onClick={() => onOpen(issue.key)}
        className="focus-ring flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm py-1 text-left"
      >
        <RowBody issue={issue} assignee={assignee} epic={epic} showEpic={showEpic} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={`Actions for ${issue.key}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => onQuickMove(issue.key, "top")}>
            <ArrowUpToLine />
            Move to top
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onQuickMove(issue.key, "bottom")}>
            <ArrowDownToLine />
            Move to bottom
          </DropdownMenuItem>
          {moveTargets.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {moveTargets.map((target) => (
                <DropdownMenuItem key={target.id} onSelect={() => onQuickMove(issue.key, "section", target.id)}>
                  {target.label}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

function BacklogSection({ section, keys, issuesByKey, rowProps, collapsed, onToggleCollapsed, isOver, selectedKeys, onSelectMany }) {
  const { setNodeRef } = useDroppable({ id: `${SECTION_PREFIX}${section.id}` })
  const issues = keys.map((key) => issuesByKey[key]).filter(Boolean)
  const points = issues.reduce((sum, issue) => sum + (issue.storyPoints ?? 0), 0)
  const selectedHere = keys.filter((key) => selectedKeys.includes(key))
  const bodyId = `backlog-section-${section.id}`

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`${bodyId}-heading`}
      className={cn("overflow-hidden rounded-lg border bg-card shadow-xs transition-colors", isOver && "border-primary/50 ring-2 ring-primary/20")}
    >
      <header className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 bg-background/60 px-3 py-2.5", !collapsed && "border-b")}>
        {keys.length > 0 && (
          <TriStateCheckbox
            label={`Select all in ${section.title}`}
            checked={selectedHere.length === keys.length}
            indeterminate={selectedHere.length > 0 && selectedHere.length < keys.length}
            onChange={() => onSelectMany(keys, selectedHere.length !== keys.length)}
          />
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          className="focus-ring flex min-w-0 cursor-pointer items-center gap-1.5 rounded-sm text-left"
        >
          <ChevronRight aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !collapsed && "rotate-90")} />
          <h2 id={`${bodyId}-heading`} className="truncate text-sm">
            {section.title}
          </h2>
        </button>
        {section.badge}
        <span className="text-xs text-muted-foreground">
          {issues.length} {issues.length === 1 ? "issue" : "issues"}
          {points > 0 && ` · ${points} pts`}
        </span>
        {section.meta}
        <div className="ml-auto flex items-center gap-2">{section.actions}</div>
      </header>
      {section.progress && !collapsed && <div className="border-b px-3 py-2.5">{section.progress}</div>}
      <div id={bodyId} hidden={collapsed}>
        <SortableContext id={section.id} items={keys} strategy={verticalListSortingStrategy}>
          <ul aria-label={`${section.title} issues`}>
            {issues.map((issue) => (
              <BacklogRow key={issue.key} issue={issue} {...rowProps(issue, section)} />
            ))}
          </ul>
        </SortableContext>
        {issues.length === 0 && (
          <p className="px-4 py-5 text-center text-sm text-muted-foreground">{section.emptyText ?? "Drag issues here to plan them."}</p>
        )}
        {section.createDefaults && (
          <div className="border-t px-2 py-1.5">
            <CreateIssueDialog defaults={section.createDefaults}>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Plus />
                Create issue
              </Button>
            </CreateIssueDialog>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Backlog with drag-and-drop between sections (sprints or epics) and within
 * them. Like the board, the arrangement is local only while dragging; the
 * drop is sent to the server via `onMove` and kept until it answers.
 *
 * @param {object} props
 * @param {{ id: string, title: string, ... }[]} props.sections  ordered sections
 * @param {(issue) => string} props.sectionOf   section id an issue belongs to
 * @param {(sectionId) => object} props.changeFor  move fields for a target section, e.g. { sprintId }
 */
export function BacklogView({ projectId, issues, sections, sectionOf, changeFor, memberMap, epicsById, groupBy, openKey, onOpen, onMove }) {
  const { selectedKeys, toggleSelected, setSelected, collapsed, toggleCollapsed } = usePlanningStore()
  const issuesByKey = useMemo(() => Object.fromEntries(issues.map((issue) => [issue.key, issue])), [issues])
  const derived = useMemo(() => {
    const map = Object.fromEntries(sections.map((section) => [section.id, []]))
    for (const issue of [...issues].sort(byRank)) map[sectionOf(issue)]?.push(issue.key)
    return map
  }, [issues, sections, sectionOf])

  const [drag, setDrag] = useState(null)
  const layout = drag?.layout ?? derived
  const titleOf = Object.fromEntries(sections.map((s) => [s.id, s.title]))
  const where = (id) => titleOf[containerOf(layout, id)] ?? "the backlog"

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function commit(key, section, keys) {
    const index = keys.indexOf(key)
    const beforeKey = keys[index - 1] ?? null
    const afterKey = keys[index + 1] ?? null
    const origin = sectionOf(issuesByKey[key])
    onMove(
      {
        key,
        ...(section !== origin ? changeFor(section) : {}),
        beforeKey,
        afterKey,
        rank: rankBetween(issuesByKey[beforeKey]?.rank ?? null, issuesByKey[afterKey]?.rank ?? null),
      },
      () => setDrag(null)
    )
  }

  /** Keyboard/menu alternative to dragging. */
  function quickMove(key, where, targetSection) {
    const origin = sectionOf(issuesByKey[key])
    const section = targetSection ?? origin
    const keys = derived[section].filter((k) => k !== key)
    const next = where === "top" ? [key, ...keys] : [...keys, key]
    setDrag({ layout: { ...derived, [origin]: derived[origin].filter((k) => k !== key), [section]: next }, pending: true })
    commit(key, section, next)
  }

  function handleDragOver({ active, over }) {
    if (!over) return
    setDrag((state) => {
      if (!state) return state
      const from = containerOf(state.layout, active.id)
      const to = containerOf(state.layout, over.id)
      if (!from || !to) return state
      if (from === to) return state.over === to ? state : { ...state, over: to }
      const target = [...state.layout[to]]
      const overIndex = target.indexOf(over.id)
      target.splice(overIndex >= 0 ? overIndex : target.length, 0, active.id)
      return { ...state, over: to, layout: { ...state.layout, [from]: state.layout[from].filter((k) => k !== active.id), [to]: target } }
    })
  }

  function handleDragEnd({ active, over }) {
    if (!drag || !over) {
      setDrag(null)
      return
    }
    const section = containerOf(drag.layout, active.id)
    let keys = drag.layout[section]
    const from = keys.indexOf(active.id)
    const to = keys.indexOf(over.id)
    if (to >= 0 && to !== from) keys = arrayMove(keys, from, to)
    const origin = drag.origin
    if (section === origin && keys.indexOf(active.id) === derived[origin].indexOf(active.id)) {
      setDrag(null)
      return
    }
    setDrag({ layout: { ...drag.layout, [section]: keys }, pending: true })
    commit(active.id, section, keys)
  }

  function selectMany(keys, select) {
    setSelected(select ? [...new Set([...selectedKeys, ...keys])] : selectedKeys.filter((k) => !keys.includes(k)))
  }

  const activeIssue = drag?.activeKey ? issuesByKey[drag.activeKey] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Press Space or Enter to pick up the issue, use the arrow keys to move it, and press Space or Enter again to drop it. Press Escape to cancel.",
        },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${active.id} in ${where(active.id)}.`,
          onDragOver: ({ active, over }) => (over ? `${active.id} is over ${where(over.id)}.` : `${active.id} is not over a section.`),
          onDragEnd: ({ active, over }) => (over ? `${active.id} dropped in ${where(active.id)}.` : `${active.id} dropped.`),
          onDragCancel: ({ active }) => `Moving ${active.id} was cancelled.`,
        },
      }}
      onDragStart={({ active }) => {
        const origin = containerOf(derived, active.id)
        setDrag({ layout: derived, activeKey: active.id, origin, over: origin })
      }}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDrag(null)}
    >
      <div className="grid grid-cols-1 gap-4" aria-busy={drag?.pending || undefined}>
        {sections.map((section) => {
          const collapseKey = `${projectId}:${groupBy}:${section.id}`
          const moveTargets = sections.filter((s) => s.id !== section.id && s.acceptsMoves !== false).map((s) => ({ id: s.id, label: s.title }))
          return (
            <BacklogSection
              key={section.id}
              section={section}
              keys={layout[section.id] ?? []}
              issuesByKey={issuesByKey}
              collapsed={Boolean(collapsed[collapseKey])}
              onToggleCollapsed={() => toggleCollapsed(collapseKey)}
              isOver={Boolean(drag?.activeKey) && drag.over === section.id && drag.origin !== section.id}
              selectedKeys={selectedKeys}
              onSelectMany={selectMany}
              rowProps={(issue) => ({
                assignee: memberMap[issue.assigneeId],
                epic: epicsById[issue.parentId],
                showEpic: groupBy === "sprint",
                selected: selectedKeys.includes(issue.key),
                onToggle: toggleSelected,
                onOpen,
                isOpen: openKey === issue.key,
                moveTargets,
                onQuickMove: quickMove,
              })}
            />
          )
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeIssue && (
          <div className="flex items-center gap-2.5 rounded-md border border-primary/40 bg-card px-3 py-2 shadow-lg">
            <RowBody issue={activeIssue} assignee={memberMap[activeIssue.assigneeId]} epic={epicsById[activeIssue.parentId]} showEpic={groupBy === "sprint"} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

