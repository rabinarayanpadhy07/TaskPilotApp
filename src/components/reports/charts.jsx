import { Bar, BarChart, CartesianGrid, LabelList, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { bucketLabel, shortDate, VELOCITY_SERIES, WORKLOAD_SERIES, workloadRows } from "@/components/reports/chart-utils"
import { issueStatusLabel } from "@/models/issue"

/*
 * Chart conventions (see the dataviz notes in index.css):
 * - one violet hue; ordered stacks use the ordinal ramp, comparisons gray out
 *   the secondary series (--chart-muted)
 * - bars <= 24px, 4px rounded data end, square at the baseline
 * - hairline solid grid, recessive axes, text in text tokens (never series color)
 * - a legend for 2+ series; every chart has a table view in its card
 */

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 }
const GRID = { stroke: "var(--chart-grid)", strokeWidth: 1 }
const CURSOR = { fill: "var(--hover)" }
const SURFACE_GAP = { stroke: "var(--surface)", strokeWidth: 2 }

/** Tooltip in the app's popover style. `rows`: [{ label, value, color? }] */
function TooltipCard({ title, rows }) {
  return (
    <div className="min-w-36 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{title}</p>
      <ul className="grid gap-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {row.color && <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ background: row.color }} />}
              {row.label}
            </span>
            <span className="font-medium text-foreground tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** HTML legend: colored swatch + text-token label. */
export function ChartLegend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

// ---------- Issue status distribution (single series, horizontal bars) ----------

export function StatusDistributionChart({ data }) {
  const rows = data.map((row) => ({ ...row, label: issueStatusLabel[row.status] ?? row.status }))
  return (
    <ResponsiveContainer width="100%" height={rows.length * 40 + 24}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} title="Issues by status" barCategoryGap={10}>
        <CartesianGrid horizontal={false} {...GRID} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={88} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip cursor={CURSOR} content={({ active, payload }) => active && payload?.length ? <TooltipCard title={payload[0].payload.label} rows={[{ label: "Issues", value: payload[0].value }]} /> : null} />
        <Bar dataKey="count" name="Issues" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
          <LabelList dataKey="count" position="right" fill="var(--foreground)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ---------- Completed over time (single series, columns) ----------

export function CompletedOverTimeChart({ data, granularity }) {
  // Weekly buckets are labelled by their first day; the tooltip shows the full range
  const rows = data.map((bucket) => ({ ...bucket, label: shortDate(bucket.start) }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} title="Issues completed over time" barCategoryGap="20%">
        <CartesianGrid vertical={false} {...GRID} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis allowDecimals={false} width={28} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={CURSOR}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const bucket = payload[0].payload
            return (
              <TooltipCard
                title={granularity === "week" ? `Week of ${bucketLabel(bucket, granularity)}` : bucketLabel(bucket, granularity)}
                rows={[
                  { label: "Completed", value: bucket.count },
                  { label: "Story points", value: bucket.points },
                ]}
              />
            )
          }}
        />
        <Bar dataKey="count" name="Completed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ---------- Sprint velocity (committed vs completed; emphasis on completed) ----------

export function VelocityChart({ data }) {
  const rows = data.map((sprint) => ({ ...sprint, label: sprint.status === "active" ? `${sprint.name} •` : sprint.name }))
  return (
    <div className="grid gap-3">
      <ChartLegend items={VELOCITY_SERIES} />
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} title="Sprint velocity" barGap={2} barCategoryGap="24%">
          <CartesianGrid vertical={false} {...GRID} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis allowDecimals={false} width={28} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={CURSOR}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const sprint = payload[0].payload
              return (
                <TooltipCard
                  title={`${sprint.name}${sprint.status === "active" ? " (active)" : ""}`}
                  rows={[
                    ...VELOCITY_SERIES.map((s) => ({ label: `${s.label} points`, value: sprint[s.key], color: s.color })),
                    { label: "Issues done", value: `${sprint.done} / ${sprint.total}` },
                  ]}
                />
              )
            }}
          />
          {VELOCITY_SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- Workload by assignee (ordered stack: ordinal ramp) ----------

export function WorkloadChart({ data }) {
  // The rounded end and the total sit on each row's last non-empty segment
  const rows = workloadRows(data).map((row) => ({ ...row, lastKey: WORKLOAD_SERIES.findLast((s) => row[s.key] > 0)?.key }))
  return (
    <div className="grid gap-3">
      <ChartLegend items={WORKLOAD_SERIES} />
      <ResponsiveContainer width="100%" height={rows.length * 36 + 28}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} title="Open issues by assignee" barCategoryGap={8}>
          <CartesianGrid horizontal={false} {...GRID} />
          <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={112} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={CURSOR}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload
              return (
                <TooltipCard
                  title={row.label}
                  rows={[
                    ...WORKLOAD_SERIES.map((s) => ({ label: s.label, value: row[s.key], color: s.color })),
                    { label: "Overdue", value: row.overdue },
                    { label: "Story points", value: row.points },
                  ]}
                />
              )
            }}
          />
          {WORKLOAD_SERIES.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="open"
              fill={s.color}
              {...SURFACE_GAP}
              shape={(props) => <Rectangle {...props} radius={props.payload.lastKey === s.key ? [0, 4, 4, 0] : 0} />}
              maxBarSize={20}
              isAnimationActive={false}
            >
              <LabelList
                dataKey={s.key}
                content={({ index, x, y, width, height }) =>
                  rows[index]?.lastKey === s.key ? (
                    <text x={x + width + 6} y={y + height / 2} dominantBaseline="central" fill="var(--foreground)" fontSize={12}>
                      {rows[index].open}
                    </text>
                  ) : null
                }
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
