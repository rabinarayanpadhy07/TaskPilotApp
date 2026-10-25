import { X } from "lucide-react"

import { FilterMenu, SearchFilter, SortMenu } from "@/components/filters"
import { IssueTypeIcon, PriorityBadge, StatusBadge } from "@/components/issues/issue-badges"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { FILTER_KEYS, ISSUE_SORTS, NONE } from "@/lib/issue-filters"
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES } from "@/models/issue"

const FIELD_LABELS = {
  status: "Status",
  assignee: "Assignee",
  priority: "Priority",
  type: "Type",
  label: "Label",
  sprint: "Sprint",
  epic: "Epic",
}

/** Builds the option list for each filter from the data available on the page. */
function buildOptions({ members = [], labels = [], sprints = [], epics = [], types }) {
  return {
    status: ISSUE_STATUSES,
    assignee: [{ value: NONE, label: "Unassigned" }, ...members.map((m) => ({ value: m.id, label: m.name }))],
    priority: ISSUE_PRIORITIES,
    type: ISSUE_TYPES.filter((t) => !types || types.includes(t.value)),
    label: labels.map((label) => ({ value: label, label })),
    sprint: [
      { value: NONE, label: "Backlog (no sprint)" },
      ...sprints.map((s) => ({ value: s.id, label: s.status === "active" ? `${s.name} (active)` : s.name })),
    ],
    epic: [{ value: NONE, label: "No epic" }, ...epics.map((e) => ({ value: e.id, label: `${e.key} ${e.title}` }))],
  }
}

function renderOption(field, option) {
  if (option.value === NONE) return <span className="text-muted-foreground">{option.label}</span>
  if (field === "status") return <StatusBadge status={option.value} />
  if (field === "priority") return <PriorityBadge priority={option.value} />
  if (field === "type") {
    return (
      <span className="flex items-center gap-2">
        <IssueTypeIcon type={option.value} />
        {option.label}
      </span>
    )
  }
  if (field === "assignee") {
    return (
      <span className="flex items-center gap-2">
        <UserAvatar name={option.label} size="sm" />
        {option.label}
      </span>
    )
  }
  return <span className="truncate">{option.label}</span>
}

/** Removable chip per active filter value, plus "Clear all". */
export function ActiveFilterChips({ filters, options, fields }) {
  const { values, set, clear } = filters
  const chips = []
  if (values.q?.trim()) chips.push({ field: "q", value: values.q, text: `Search: “${values.q.trim()}”` })
  for (const field of fields) {
    for (const value of values[field] ?? []) {
      const option = options[field]?.find((o) => o.value === value)
      chips.push({ field, value, text: `${FIELD_LABELS[field]}: ${option?.label ?? value}` })
    }
  }
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters" role="group">
      {chips.map((chip) => (
        <span
          key={`${chip.field}-${chip.value}`}
          className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-primary/20 bg-selected pr-1 pl-2.5 text-xs font-medium text-selected-foreground"
        >
          <span className="truncate">{chip.text}</span>
          <button
            type="button"
            aria-label={`Remove filter ${chip.text}`}
            onClick={() => set(chip.field, chip.field === "q" ? "" : values[chip.field].filter((v) => v !== chip.value))}
            className="focus-ring flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-primary/10"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={() => clear(FILTER_KEYS)}>
        Clear all
      </Button>
    </div>
  )
}

/**
 * Toolbar for issue lists: search, multi-select filters, optional sort and
 * removable chips for everything that's active. State lives in the URL, so
 * filtered views can be shared.
 *
 * @param {object} props
 * @param {ReturnType<import("@/lib/use-url-filters").useUrlFilters>} props.filters
 * @param {string[]} [props.fields]  which filters to offer
 * @param {object} props.context     { members, labels, sprints, epics, types }
 * @param {boolean} [props.sortable]
 * @param {React.ReactNode} [props.trailing]  e.g. a result count
 */
export function IssueFilterBar({ filters, fields = ["status", "assignee", "priority", "type", "label", "sprint", "epic"], context, sortable = false, sortOptions = ISSUE_SORTS, trailing }) {
  const { values, set } = filters
  const options = buildOptions(context)
  const offered = fields.filter((field) => field !== "sprint" || (context.sprints?.length ?? 0) > 0)

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchFilter value={values.q} onChange={(q) => set("q", q)} placeholder="Search title, key or label" label="Search issues" />
        {offered.map((field) => (
          <FilterMenu
            key={field}
            label={FIELD_LABELS[field]}
            options={options[field]}
            value={values[field]}
            onChange={(v) => set(field, v)}
            renderOption={(option) => renderOption(field, option)}
          />
        ))}
        <div className="ml-auto flex items-center gap-3">
          {trailing}
          {sortable && (
            <SortMenu value={values.sort || sortOptions[0].value} onChange={(sort) => set("sort", sort === sortOptions[0].value ? "" : sort)} options={sortOptions} />
          )}
        </div>
      </div>
      <ActiveFilterChips filters={filters} options={options} fields={offered} />
    </div>
  )
}
