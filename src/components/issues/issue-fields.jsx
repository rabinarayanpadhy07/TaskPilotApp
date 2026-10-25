import { useId, useState } from "react"
import { Calendar, Check, ChevronDown, Plus, Tag, UserRound, X } from "lucide-react"

import { IssueTypeIcon, PriorityBadge, StatusBadge } from "@/components/issues/issue-badges"
import { DueDate } from "@/components/issues/issue-row"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { UserAvatar } from "@/components/user-avatar"
import { addDaysISO, formatDueDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  issuePriorityLabel,
  issueStatusLabel,
  issueTypeLabel,
  STORY_POINT_OPTIONS,
  todayISO,
} from "@/models/issue"

/**
 * Button that opens a picker.
 * `variant="field"`  input-like, for forms
 * `variant="inline"` borderless, for the issue properties panel
 * `label` + `valueText` form the accessible name ("Status: In progress").
 */
export function PickerTrigger({ variant = "field", label, valueText, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label ? `${label}: ${valueText || "None"}` : undefined}
      className={cn(
        "focus-ring flex min-w-0 cursor-pointer items-center gap-2 rounded-md text-left text-sm text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variant === "field"
          ? "h-9 w-full border border-input bg-surface px-3 shadow-xs hover:border-[color-mix(in_oklab,var(--input),var(--foreground)_15%)] aria-invalid:border-danger data-[state=open]:border-primary data-[state=open]:ring-[3px] data-[state=open]:ring-ring/20"
          : "-mx-2 min-h-8 w-[calc(100%+1rem)] px-2 py-1 hover:bg-hover disabled:hover:bg-transparent data-[state=open]:bg-hover",
        className
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {variant === "field" && <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
    </button>
  )
}

const Placeholder = ({ children }) => <span className="truncate text-muted-foreground">{children}</span>

// ---------- Fixed-option pickers (dropdown menus with radio semantics) ----------

function OptionMenu({ value, onChange, options, renderOption, label, valueText, trigger, variant, disabled, align = "start", ...props }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <PickerTrigger variant={variant} label={label} valueText={valueText} disabled={disabled} {...props}>
          {trigger}
        </PickerTrigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        <DropdownMenuRadioGroup value={value == null ? "" : String(value)} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={String(option.value)} indicator="end">
              {renderOption(option)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function StatusSelect({ value, onChange, ...props }) {
  return (
    <OptionMenu
      value={value}
      onChange={onChange}
      options={ISSUE_STATUSES}
      renderOption={(option) => <StatusBadge status={option.value} />}
      label="Status"
      valueText={issueStatusLabel[value]}
      trigger={<StatusBadge status={value} />}
      {...props}
    />
  )
}

export function PrioritySelect({ value, onChange, ...props }) {
  return (
    <OptionMenu
      value={value}
      onChange={onChange}
      options={ISSUE_PRIORITIES}
      renderOption={(option) => <PriorityBadge priority={option.value} />}
      label="Priority"
      valueText={issuePriorityLabel[value]}
      trigger={<PriorityBadge priority={value} />}
      {...props}
    />
  )
}

export function IssueTypeSelect({ value, onChange, types = ISSUE_TYPES.map((t) => t.value), ...props }) {
  return (
    <OptionMenu
      value={value}
      onChange={onChange}
      options={ISSUE_TYPES.filter((t) => types.includes(t.value))}
      renderOption={(option) => (
        <span className="flex items-center gap-2">
          <IssueTypeIcon type={option.value} />
          {option.label}
        </span>
      )}
      label="Issue type"
      valueText={issueTypeLabel[value]}
      trigger={
        <>
          <IssueTypeIcon type={value} />
          <span className="truncate">{issueTypeLabel[value]}</span>
        </>
      }
      {...props}
    />
  )
}

const pointOptions = [{ value: "none", label: "None" }, ...STORY_POINT_OPTIONS.map((n) => ({ value: n, label: String(n) }))]

export function StoryPointsSelect({ value, onChange, ...props }) {
  return (
    <OptionMenu
      value={value ?? "none"}
      onChange={(next) => onChange(next === "none" ? null : Number(next))}
      options={pointOptions}
      renderOption={(option) => (option.value === "none" ? <span className="text-muted-foreground">None</span> : `${option.label} points`)}
      label="Story points"
      valueText={value == null ? "" : String(value)}
      trigger={value == null ? <Placeholder>None</Placeholder> : <span className="tabular-nums">{value}</span>}
      {...props}
    />
  )
}

/** Sprint for a story/task/bug; "Backlog" means no sprint. Only open sprints are offered. */
export function SprintSelect({ value, onChange, sprints = [], ...props }) {
  const options = [
    { value: "backlog", label: "Backlog" },
    ...sprints.filter((s) => s.status !== "completed" || s.id === value).map((s) => ({ value: s.id, label: s.name, status: s.status })),
  ]
  const current = sprints.find((s) => s.id === value)
  return (
    <OptionMenu
      value={value ?? "backlog"}
      onChange={(next) => onChange(next === "backlog" ? null : next)}
      options={options}
      renderOption={(option) => (
        <span className="flex w-full items-center gap-2">
          {option.label}
          {option.status === "active" && <span className="ml-auto text-xs text-muted-foreground">active</span>}
        </span>
      )}
      label="Sprint"
      valueText={current?.name ?? "Backlog"}
      trigger={current ? <span className="truncate">{current.name}</span> : <Placeholder>Backlog</Placeholder>}
      {...props}
    />
  )
}

// ---------- Searchable pickers (popover + command list) ----------

/**
 * Pick a workspace member. Used for assignee, reporter and project lead.
 * `allowNone` adds an "Unassigned" option.
 */
export function MemberSelect({
  value,
  onChange,
  members = [],
  label = "Assignee",
  noneLabel = "Unassigned",
  allowNone = true,
  variant,
  disabled,
  ...props
}) {
  const [open, setOpen] = useState(false)
  const selected = members.find((member) => member.id === value)

  function choose(id) {
    onChange(id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <PickerTrigger variant={variant} label={label} valueText={selected?.name ?? noneLabel} disabled={disabled} {...props}>
          {selected ? (
            <>
              <UserAvatar name={selected.name} size="sm" />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-input">
                <UserRound aria-hidden="true" className="size-3 text-muted-foreground" />
              </span>
              <Placeholder>{noneLabel}</Placeholder>
            </>
          )}
        </PickerTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search people…" aria-label={`Search ${label.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>No people found.</CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem value={`__none ${noneLabel}`} onSelect={() => choose(null)}>
                  <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-input">
                    <UserRound aria-hidden="true" className="size-3 text-muted-foreground" />
                  </span>
                  <span className="flex-1">{noneLabel}</span>
                  {value == null && <Check className="text-primary" aria-label="Selected" />}
                </CommandItem>
              )}
              {members.map((member) => (
                <CommandItem key={member.id} value={`${member.name} ${member.email}`} onSelect={() => choose(member.id)}>
                  <UserAvatar name={member.name} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{member.name}</span>
                    {member.title && <span className="truncate text-xs text-muted-foreground">{member.title}</span>}
                  </span>
                  {member.id === value && <Check className="text-primary" aria-label="Selected" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const normalizeLabel = (text) => text.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 30)

export function LabelChip({ label, onRemove }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md border bg-surface px-2 text-xs text-foreground">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove label ${label}`}
          className="focus-ring -mr-1 cursor-pointer rounded-sm text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}

/** Multi-select labels with search; typing a new name offers to create it. */
export function LabelsSelect({ value = [], onChange, options = [], variant, disabled, ...props }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const all = [...new Set([...options, ...value])].sort()
  const candidate = normalizeLabel(search)
  const canCreate = candidate.length > 0 && !all.includes(candidate)

  function toggle(label) {
    onChange(value.includes(label) ? value.filter((l) => l !== label) : [...value, label])
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch("")
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <PickerTrigger
          variant={variant}
          label="Labels"
          valueText={value.join(", ")}
          disabled={disabled}
          className={cn(variant !== "field" && "h-auto")}
          {...props}
        >
          {value.length === 0 ? (
            <>
              <Tag aria-hidden="true" className="size-4 text-muted-foreground" />
              <Placeholder>Add labels</Placeholder>
            </>
          ) : (
            <span className="flex flex-wrap gap-1">
              {value.map((label) => (
                <LabelChip key={label} label={label} />
              ))}
            </span>
          )}
        </PickerTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search or create…" aria-label="Search labels" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty className={canCreate ? "hidden" : undefined}>No labels found.</CommandEmpty>
            <CommandGroup>
              {all.map((label) => (
                <CommandItem key={label} value={label} onSelect={() => toggle(label)}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-4 items-center justify-center rounded-[4px] border",
                      value.includes(label) ? "border-primary bg-primary text-primary-foreground" : "border-input"
                    )}
                  >
                    {value.includes(label) && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="flex-1">{label}</span>
                  <span className="sr-only">{value.includes(label) ? "(selected)" : ""}</span>
                </CommandItem>
              ))}
              {canCreate && (
                <CommandItem
                  value={`__create ${candidate}`}
                  onSelect={() => {
                    onChange([...value, candidate])
                    setSearch("")
                  }}
                >
                  <Plus className="text-muted-foreground" />
                  Create label “{candidate}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Due date: native date input (fully keyboard accessible) plus quick picks. */
export function DueDatePicker({ value, onChange, done = false, variant, disabled, ...props }) {
  const [open, setOpen] = useState(false)
  const inputId = useId()

  function choose(next) {
    onChange(next)
    setOpen(false)
  }

  const quickPicks = [
    { label: "Today", value: todayISO() },
    { label: "Tomorrow", value: addDaysISO(1) },
    { label: "In a week", value: addDaysISO(7) },
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <PickerTrigger variant={variant} label="Due date" valueText={value ? formatDueDate(value) : ""} disabled={disabled} {...props}>
          {value ? (
            <DueDate value={value} done={done} className="text-sm [&_svg]:size-4" />
          ) : (
            <>
              <Calendar aria-hidden="true" className="size-4 text-muted-foreground" />
              <Placeholder>No due date</Placeholder>
            </>
          )}
        </PickerTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
          Pick a date
        </label>
        <input
          id={inputId}
          type="date"
          value={value ?? ""}
          onChange={(event) => event.target.value && onChange(event.target.value)}
          className="mt-1.5 h-9 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/20"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quickPicks.map((pick) => (
            <Button key={pick.label} type="button" variant="secondary" size="sm" onClick={() => choose(pick.value)}>
              {pick.label}
            </Button>
          ))}
          {value && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => choose(null)}>
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Pick a parent issue from eligible candidates. */
export function ParentSelect({ value, onChange, candidates = [], allowNone = true, variant, disabled, emptyText = "No eligible parents in this project.", ...props }) {
  const [open, setOpen] = useState(false)
  const selected = candidates.find((issue) => issue.id === value)

  function choose(id) {
    onChange(id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <PickerTrigger
          variant={variant}
          label="Parent"
          valueText={selected ? `${selected.key} ${selected.title}` : ""}
          disabled={disabled}
          {...props}
        >
          {selected ? (
            <>
              <IssueTypeIcon type={selected.type} />
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{selected.key}</span>
              <span className="truncate">{selected.title}</span>
            </>
          ) : (
            <Placeholder>No parent</Placeholder>
          )}
        </PickerTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search issues…" aria-label="Search parent issues" />
          <CommandList>
            <CommandEmpty>{candidates.length === 0 ? emptyText : "No matching issues."}</CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem value="__none no parent" onSelect={() => choose(null)}>
                  <span className="flex-1 text-muted-foreground">No parent</span>
                  {value == null && <Check className="text-primary" aria-label="Selected" />}
                </CommandItem>
              )}
              {candidates.map((issue) => (
                <CommandItem key={issue.id} value={`${issue.key} ${issue.title}`} onSelect={() => choose(issue.id)}>
                  <IssueTypeIcon type={issue.type} />
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{issue.key}</span>
                  <span className="flex-1 truncate">{issue.title}</span>
                  {issue.id === value && <Check className="text-primary" aria-label="Selected" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
