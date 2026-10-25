import { useMemo, useState } from "react"
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
import { ListTree, Plus } from "lucide-react"

import { IssueTypeIcon, PriorityIcon } from "@/components/issues/issue-badges"
import { CreateIssueDialog } from "@/components/issues/issue-form"
import { DueDate } from "@/components/issues/issue-row"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { createContainerCollision } from "@/components/board/collision"
import { cn } from "@/lib/utils"
import { byRank, rankBetween } from "@/models/rank"

const BOARD_COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
]

const columnLabel = Object.fromEntries(BOARD_COLUMNS.map((c) => [c.id, c.label]))
/** Backlog-status issues in a sprint show up (and stay) in To Do. */
const columnOf = (issue) => (issue.status === "backlog" ? "todo" : issue.status)
const COLUMN_PREFIX = "column:"

const collisionDetection = createContainerCollision(COLUMN_PREFIX)

function containerOf(columns, id) {
  if (typeof id === "string" && id.startsWith(COLUMN_PREFIX)) return id.slice(COLUMN_PREFIX.length)
  return Object.keys(columns).find((column) => columns[column].includes(id))
}

/** Visual content of a card; shared by the sortable card and the drag overlay. */
function CardBody({ issue, assignee, subtasks }) {
  return (
    <>
      <p className="line-clamp-3 text-sm leading-5 font-medium text-foreground">{issue.title}</p>
      {issue.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.labels.slice(0, 2).map((label) => (
            <span key={label} className="rounded-sm border bg-surface px-1.5 text-[11px] text-muted-foreground">
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <IssueTypeIcon type={issue.type} label />
        <span className={cn("shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground", issue.status === "done" && "line-through")}>{issue.key}</span>
        {subtasks && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground" title="Subtasks done">
            <ListTree aria-hidden="true" className="size-3.5" />
            {subtasks.done}/{subtasks.total}
            <span className="sr-only">subtasks done</span>
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {issue.dueDate && issue.status !== "done" && <DueDate value={issue.dueDate} showIcon={false} className="text-[11px]" />}
          {issue.storyPoints != null && (
            <span className="min-w-5 rounded-full bg-muted px-1.5 text-center text-[11px] font-semibold tabular-nums text-muted-foreground" title="Story points">
              {issue.storyPoints}
              <span className="sr-only"> story points</span>
            </span>
          )}
          <PriorityIcon priority={issue.priority} label />
          {assignee ? (
            <UserAvatar name={assignee.name} size="sm" title={assignee.name} />
          ) : (
            <span role="img" aria-label="Unassigned" title="Unassigned" className="size-6 rounded-full border border-dashed border-input" />
          )}
        </span>
      </div>
    </>
  )
}

function BoardCard({ issue, assignee, subtasks, selected, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.key })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`${issue.key}: ${issue.title}`}
      aria-current={selected ? "true" : undefined}
      onClick={() => onOpen(issue.key)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          onOpen(issue.key)
        } else {
          listeners?.onKeyDown?.(event)
        }
      }}
      className={cn(
        "focus-ring cursor-grab touch-manipulation rounded-lg border bg-card p-3 shadow-xs transition-[border-color,box-shadow,background-color] select-none hover:border-input hover:shadow-sm active:cursor-grabbing",
        selected && "border-primary bg-selected/60 ring-1 ring-primary/40",
        isDragging && "border-dashed border-primary/40 bg-selected/40 opacity-50 shadow-none"
      )}
    >
      <CardBody issue={issue} assignee={assignee} subtasks={subtasks} />
    </li>
  )
}

function BoardColumn({ column, keys, issuesByKey, memberMap, subtaskCounts, selectedKey, isOver, onOpen, createDefaults }) {
  const { setNodeRef } = useDroppable({ id: `${COLUMN_PREFIX}${column.id}` })
  const issues = keys.map((key) => issuesByKey[key]).filter(Boolean)
  const points = issues.reduce((sum, issue) => sum + (issue.storyPoints ?? 0), 0)
  const headingId = `board-column-${column.id}`

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/60 transition-colors sm:w-auto sm:min-w-64 sm:flex-1",
        isOver && "border-primary/50 bg-selected ring-2 ring-primary/20"
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <h2 id={headingId} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {column.label}
        </h2>
        <span className="rounded-full bg-surface px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground" aria-label={`${issues.length} issues`}>
          {issues.length}
        </span>
        {points > 0 && <span className="text-[11px] text-muted-foreground">{points} pts</span>}
        <CreateIssueDialog defaults={{ ...createDefaults, status: column.id }}>
          <Button variant="ghost" size="icon-xs" className="ml-auto text-muted-foreground" aria-label={`Add issue to ${column.label}`}>
            <Plus />
          </Button>
        </CreateIssueDialog>
      </header>
      <SortableContext id={column.id} items={keys} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-28 flex-1 flex-col gap-2 px-2 pb-2" aria-label={`${column.label} issues`}>
          {issues.map((issue) => (
            <BoardCard
              key={issue.key}
              issue={issue}
              assignee={memberMap[issue.assigneeId]}
              subtasks={subtaskCounts[issue.id]}
              selected={selectedKey === issue.key}
              onOpen={onOpen}
            />
          ))}
          {issues.length === 0 && (
            <li className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-input/80 px-3 py-6 text-center text-xs text-muted-foreground">
              Drop issues here
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  )
}

/**
 * Kanban board with drag-and-drop between and within columns.
 *
 * During a drag the arrangement is local UI state; on drop `onMove` is called
 * with the new status and neighbours, and the arrangement is kept until the
 * server answers (so the card doesn't jump back). The server decides the final
 * order; failures roll back.
 *
 * @param {object} props
 * @param {import("@/models/issue").Issue[]} props.issues  issues to show (already filtered)
 * @param {(move, done: () => void) => void} props.onMove
 */
export function KanbanBoard({ issues, memberMap, subtaskCounts, selectedKey, onOpen, onMove, createDefaults }) {
  const issuesByKey = useMemo(() => Object.fromEntries(issues.map((issue) => [issue.key, issue])), [issues])
  const derived = useMemo(() => {
    const columns = Object.fromEntries(BOARD_COLUMNS.map((c) => [c.id, []]))
    for (const issue of [...issues].sort(byRank)) columns[columnOf(issue)]?.push(issue.key)
    return columns
  }, [issues])

  const [drag, setDrag] = useState(null) // { columns, activeKey, origin, over, pending }
  const columns = drag?.columns ?? derived

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter is reserved for opening the issue
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  )

  const where = (id) => columnLabel[containerOf(columns, id)] ?? "the board"
  const accessibility = {
    screenReaderInstructions: {
      draggable:
        "Press Space to pick up the issue. Use the arrow keys to move it between columns and positions, then press Space to drop it or Escape to cancel. Press Enter to open the issue.",
    },
    announcements: {
      onDragStart: ({ active }) => `Picked up ${active.id} in ${where(active.id)}.`,
      onDragOver: ({ active, over }) => (over ? `${active.id} is over ${where(over.id)}.` : `${active.id} is not over a column.`),
      onDragEnd: ({ active, over }) => (over ? `${active.id} dropped in ${where(active.id)}.` : `${active.id} dropped.`),
      onDragCancel: ({ active }) => `Moving ${active.id} was cancelled.`,
    },
  }

  function handleDragStart({ active }) {
    const origin = containerOf(derived, active.id)
    setDrag({ columns: derived, activeKey: active.id, origin, over: origin })
  }

  function handleDragOver({ active, over }) {
    if (!over) return
    setDrag((state) => {
      if (!state) return state
      const from = containerOf(state.columns, active.id)
      const to = containerOf(state.columns, over.id)
      if (!from || !to) return state
      if (from === to) return state.over === to ? state : { ...state, over: to }
      const target = [...state.columns[to]]
      const overIndex = target.indexOf(over.id)
      target.splice(overIndex >= 0 ? overIndex : target.length, 0, active.id)
      return {
        ...state,
        over: to,
        columns: { ...state.columns, [from]: state.columns[from].filter((key) => key !== active.id), [to]: target },
      }
    })
  }

  function handleDragEnd({ active, over }) {
    if (!drag || !over) {
      setDrag(null)
      return
    }
    const column = containerOf(drag.columns, active.id)
    let keys = drag.columns[column]
    const from = keys.indexOf(active.id)
    const to = keys.indexOf(over.id)
    if (to >= 0 && to !== from) keys = arrayMove(keys, from, to)

    const index = keys.indexOf(active.id)
    const moved = column !== drag.origin || index !== derived[drag.origin].indexOf(active.id)
    if (!moved) {
      setDrag(null)
      return
    }
    const beforeKey = keys[index - 1] ?? null
    const afterKey = keys[index + 1] ?? null
    setDrag({ columns: { ...drag.columns, [column]: keys }, activeKey: null, pending: true })
    onMove(
      {
        key: active.id,
        status: column !== drag.origin ? column : undefined,
        beforeKey,
        afterKey,
        rank: rankBetween(issuesByKey[beforeKey]?.rank ?? null, issuesByKey[afterKey]?.rank ?? null),
      },
      () => setDrag(null)
    )
  }

  const activeIssue = drag?.activeKey ? issuesByKey[drag.activeKey] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={accessibility}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDrag(null)}
    >
      {/* relative: absolutely positioned sr-only text must be clipped by this scroller too */}
      <div className="relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" aria-busy={drag?.pending || undefined}>
        {BOARD_COLUMNS.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            keys={columns[column.id]}
            issuesByKey={issuesByKey}
            memberMap={memberMap}
            subtaskCounts={subtaskCounts}
            selectedKey={selectedKey}
            isOver={Boolean(drag?.activeKey) && drag.over === column.id && drag.origin !== column.id}
            onOpen={onOpen}
            createDefaults={createDefaults}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeIssue && (
          <div className="w-72 cursor-grabbing rounded-lg border border-primary/40 bg-card p-3 shadow-lg">
            <CardBody issue={activeIssue} assignee={memberMap[activeIssue.assigneeId]} subtasks={subtaskCounts[activeIssue.id]} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
