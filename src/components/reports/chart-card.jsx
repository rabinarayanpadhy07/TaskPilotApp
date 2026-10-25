import { useState } from "react"
import { BarChart3, Table2 } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

/**
 * Card around one report. Charts get a Chart/Table switch: the table is the
 * accessible equivalent of the chart and shows every value.
 *
 * @param {() => React.ReactNode} [props.table]   table view (omit for list-only cards)
 * @param {object} [props.empty]  { icon, title, description } shown instead of the content
 */
export function ChartCard({ id, title, description, meta, table, empty, isRefreshing, className, children }) {
  const [view, setView] = useState("chart")
  const headingId = `${id}-title`
  const showTable = table && view === "table"

  return (
    <section aria-labelledby={headingId} className={cn("flex min-w-0 flex-col rounded-lg border bg-card p-4 shadow-xs sm:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId}>{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {meta}
          {table && !empty && (
            <div role="group" aria-label={`${title} view`} className="inline-flex rounded-md border bg-surface p-0.5">
              {[
                { value: "chart", label: "Chart", icon: BarChart3 },
                { value: "table", label: "Table", icon: Table2 },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={view === option.value}
                  onClick={() => setView(option.value)}
                  className={cn(
                    "focus-ring inline-flex h-6 cursor-pointer items-center gap-1 rounded-[5px] px-2 text-xs font-medium transition-colors",
                    view === option.value ? "bg-selected text-selected-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <option.icon aria-hidden="true" className="size-3.5" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={cn("min-w-0 flex-1 transition-opacity", isRefreshing && "opacity-60")} aria-busy={isRefreshing || undefined}>
        {empty ? (
          <EmptyState icon={empty.icon} title={empty.title} description={empty.description} className="py-8" />
        ) : showTable ? (
          table()
        ) : (
          children
        )}
      </div>
    </section>
  )
}

/** Compact data table used by the table views. `columns`: [{ key, label, numeric?, render? }] */
export function DataTable({ caption, columns, rows, rowKey }) {
  return (
    <div className="max-h-80 overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-muted">
          <tr className="text-left text-xs text-muted-foreground">
            {columns.map((col) => (
              <th key={col.key} scope="col" className={cn("px-3 py-2 font-medium", col.numeric && "text-right")}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={rowKey ? rowKey(row) : index}>
              {columns.map((col, colIndex) => {
                const content = col.render ? col.render(row) : row[col.key]
                return colIndex === 0 ? (
                  <th key={col.key} scope="row" className="px-3 py-1.5 text-left font-normal">
                    {content}
                  </th>
                ) : (
                  <td key={col.key} className={cn("px-3 py-1.5", col.numeric && "text-right tabular-nums")}>
                    {content}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
