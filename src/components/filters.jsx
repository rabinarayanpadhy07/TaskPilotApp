import { ChevronDown, LayoutGrid, List, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Search box for list toolbars, with a clear button. */
export function SearchFilter({ value, onChange, placeholder = "Search…", label = "Search", className }) {
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Input
        type="search"
        aria-label={label}
        leadingIcon={Search}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pr-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="focus-ring absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-hover hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/**
 * Multi-select filter in a dropdown. The trigger shows how many values are
 * selected; each option may render an icon/badge via `renderOption`.
 */
export function FilterMenu({ label, options, value, onChange, renderOption }) {
  const count = value.length
  const toggle = (optionValue, checked) =>
    onChange(checked ? [...value, optionValue] : value.filter((v) => v !== optionValue))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className={cn("data-[state=open]:bg-hover", count > 0 && "border-primary/30 bg-selected text-selected-foreground hover:bg-selected")}
          aria-label={count > 0 ? `${label} filter, ${count} selected` : `${label} filter`}
        >
          {label}
          {count > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">{count}</span>
          )}
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={value.includes(option.value)}
            onCheckedChange={(checked) => toggle(option.value, checked)}
            onSelect={(event) => event.preventDefault()}
          >
            {renderOption ? renderOption(option) : option.label}
          </DropdownMenuCheckboxItem>
        ))}
        {count > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => onChange([])} className="pl-2 text-muted-foreground">
              Clear {label.toLowerCase()} filter
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Single-choice dropdown (e.g. sort order). */
export function SortMenu({ value, onChange, options, label = "Sort" }) {
  const current = options.find((option) => option.value === value) ?? options[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground data-[state=open]:bg-hover" aria-label={`${label}: ${current.label}`}>
          {label}: <span className="text-foreground">{current.label}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuRadioGroup value={current.value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} indicator="end">
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Grid / list switch (toggle buttons with aria-pressed). */
export function ViewToggle({ value, onChange }) {
  const options = [
    { value: "grid", label: "Grid view", icon: LayoutGrid },
    { value: "list", label: "List view", icon: List },
  ]
  return (
    <div role="group" aria-label="View" className="inline-flex rounded-md border bg-surface p-0.5 shadow-xs">
      {options.map((option) => {
        const Icon = option.icon
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "focus-ring flex size-7 cursor-pointer items-center justify-center rounded-[5px] transition-colors",
              active ? "bg-selected text-primary" : "text-muted-foreground hover:bg-hover hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
