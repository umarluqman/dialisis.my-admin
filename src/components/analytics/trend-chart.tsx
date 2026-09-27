import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import type { getAnalyticsOverview } from "@/core/functions/analytics-functions"
import { CONTACT_KINDS, CONTACT_LABELS, type ContactKind } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { CONTACT_COLORS, formatDay, formatLongDay, formatNumber } from "./format"

type DailyPoint = Awaited<ReturnType<typeof getAnalyticsOverview>>["daily"][number]
type SeriesKey = "views" | "visitors" | "leads" | ContactKind
type Series = { key: SeriesKey; label: string; color: string }

const METRICS = [
  { key: "views", label: "Views", unit: "views" },
  { key: "visitors", label: "Visitors", unit: "visitors" },
  { key: "contacts", label: "Contacts", unit: "contacts" },
  { key: "leads", label: "Leads", unit: "leads" },
] as const
type MetricKey = (typeof METRICS)[number]["key"]

const TOOLTIP_ROWS: Series[] = [
  { key: "views", label: "Page views", color: "bg-primary" },
  { key: "visitors", label: "Visitors", color: "bg-primary" },
  ...CONTACT_KINDS.map((kind) => ({
    key: kind,
    label: CONTACT_LABELS[kind],
    color: CONTACT_COLORS[kind],
  })),
  { key: "leads", label: "Leads", color: "bg-chart-4" },
]

function seriesFor(metric: MetricKey, contact?: ContactKind) {
  if (metric === "contacts") {
    const kinds = contact ? [contact] : CONTACT_KINDS
    return TOOLTIP_ROWS.filter((row) => kinds.includes(row.key as ContactKind))
  }
  return TOOLTIP_ROWS.filter((row) => row.key === metric)
}

function totalOf(point: DailyPoint, series: Series[]) {
  let total = 0
  for (const { key } of series) {
    const value = point[key]
    if (value === null) return null
    total += value
  }
  return total
}

function niceCeil(value: number) {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((step) => step * magnitude >= value)! * magnitude
}

export function TrendChart({
  points,
  contact,
  onSelectDay,
}: {
  points: DailyPoint[]
  contact?: ContactKind
  onSelectDay: (day: string) => void
}) {
  const [metric, setMetric] = useState<MetricKey>("views")
  const [active, setActive] = useState<number | null>(null)
  const pointerType = useRef("mouse")

  const { label, unit } = METRICS.find((option) => option.key === metric)!
  const series = seriesFor(metric, contact)
  const totals = points.map((point) => totalOf(point, series))
  const untracked = totals.filter((value) => value === null).length
  const tracked = totals.filter((value): value is number => value !== null)
  const peak = Math.max(...tracked, 0)
  const top = niceCeil(peak)
  const ticks = top % 2 === 0 ? [top, top / 2, 0] : [top, 0]
  const sum = tracked.reduce((total, value) => total + value, 0)
  const peakDay = points[totals.indexOf(peak)]?.day
  const canDrill = points.length > 1
  const activePoint = active === null ? null : points[active]
  const activeTracked = active !== null && totals[active] !== null

  const indexAt = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const index = Math.floor(((event.clientX - rect.left) / rect.width) * points.length)
    return Math.min(points.length - 1, Math.max(0, index))
  }

  const drill = (index: number) => {
    if (canDrill && totals[index] !== null) onSelectDay(points[index].day)
  }

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const index = indexAt(event)
    if (pointerType.current === "touch" && active !== index) {
      setActive(index)
      return
    }
    drill(index)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = points.length - 1
    const current = active ?? last
    const next = {
      ArrowLeft: Math.max(0, current - 1),
      ArrowRight: Math.min(last, current + 1),
      Home: 0,
      End: last,
    }[event.key]
    if (next !== undefined) {
      event.preventDefault()
      setActive(next)
    } else if ((event.key === "Enter" || event.key === " ") && active !== null) {
      event.preventDefault()
      drill(active)
    }
  }

  return (
    <figure>
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Chart metric"
          className="flex gap-1 rounded-lg border bg-card p-1"
        >
          {METRICS.map((option) => (
            <Button
              key={option.key}
              size="sm"
              variant={metric === option.key ? "secondary" : "ghost"}
              aria-pressed={metric === option.key}
              onClick={() => setMetric(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{formatNumber(sum)}</span>{" "}
          {unit}
          {peak > 0 && points.length > 1 && ` · peak ${formatNumber(peak)} on ${formatDay(peakDay)}`}
        </span>
      </figcaption>

      {series.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {series.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("size-2.5 rounded-[3px]", item.color)} />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <p className="sr-only">
        {sum === 0
          ? `${label}: no data in this period.`
          : `${label}: ${formatNumber(sum)} ${unit} in total, peak of ${formatNumber(peak)} on ${formatDay(peakDay)}.`}
      </p>

      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        <div
          aria-hidden="true"
          className="relative h-44 w-8 text-right text-[11px] tabular-nums text-muted-foreground"
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${100 - (tick / top) * 100}%` }}
            >
              {formatNumber(tick)}
            </span>
          ))}
        </div>

        <div
          tabIndex={0}
          role="group"
          aria-label={`${label} per day. Use arrow keys to move between days${canDrill ? ", Enter to view a day" : ""}.`}
          onPointerDown={(event) => (pointerType.current = event.pointerType)}
          onPointerMove={(event) => {
            pointerType.current = event.pointerType
            if (event.pointerType === "mouse") setActive(indexAt(event))
          }}
          onPointerLeave={(event) => event.pointerType === "mouse" && setActive(null)}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onBlur={() => setActive(null)}
          className={cn(
            "relative h-44 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            canDrill && activeTracked && "cursor-pointer"
          )}
        >
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden="true"
              className="absolute inset-x-0 border-t"
              style={{ top: `${100 - (tick / top) * 100}%` }}
            />
          ))}

          <div aria-hidden="true" className="absolute inset-0 flex">
            {points.map((point, index) => {
              const total = totals[index]
              return (
                <div
                  key={point.day}
                  className={cn(
                    "flex h-full flex-1 items-end justify-center rounded-t-[4px]",
                    points.length > 40 ? "px-px" : "px-0.5",
                    active === index && "bg-muted"
                  )}
                >
                  {total === null ? null : total === 0 ? (
                    <div className="h-0.5 w-full max-w-6 bg-border" />
                  ) : (
                    <div
                      className="flex w-full max-w-6 flex-col-reverse overflow-hidden rounded-t-[4px]"
                      style={{ height: `${Math.max((total / top) * 100, 3)}%` }}
                    >
                      {series.map((item) => {
                        const value = point[item.key]!
                        return value > 0 ? (
                          <div
                            key={item.key}
                            className={cn("border-b-2 border-card first:border-b-0", item.color)}
                            style={{ flex: `${value} 1 0` }}
                          />
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {untracked > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center overflow-hidden rounded-t-[4px] bg-muted/60 bg-[repeating-linear-gradient(135deg,var(--border)_0_1px,transparent_1px_7px)] px-1 text-center text-[11px] text-muted-foreground"
              style={{ width: `${(untracked / points.length) * 100}%` }}
            >
              Not tracked yet
            </div>
          )}

          <div aria-live="polite" className="sr-only">
            {activePoint &&
              `${formatLongDay(activePoint.day)}: ${
                totals[active!] === null
                  ? "not tracked yet"
                  : `${formatNumber(totals[active!]!)} ${unit}`
              }`}
          </div>

          {activePoint && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 z-10 w-48 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md"
              style={
                active! < points.length / 2
                  ? { left: `calc(${((active! + 1) / points.length) * 100}% + 8px)` }
                  : { right: `calc(${((points.length - active!) / points.length) * 100}% + 8px)` }
              }
            >
              <p className="text-xs font-medium text-muted-foreground">
                {formatLongDay(activePoint.day)}
              </p>
              {activeTracked ? (
                <ul className="mt-2 space-y-1">
                  {TOOLTIP_ROWS.map((row) => {
                    const value = activePoint[row.key]
                    const charted = series.some((item) => item.key === row.key)
                    return (
                      <li key={row.key} className="flex items-center gap-2 text-sm">
                        <span
                          className={cn("h-0.5 w-3 rounded-full", charted ? row.color : "bg-transparent")}
                        />
                        <span className="min-w-8 font-semibold tabular-nums">
                          {value === null ? "–" : formatNumber(value)}
                        </span>
                        <span className="text-muted-foreground">{row.label}</span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm">Not tracked yet</p>
              )}
              {canDrill && activeTracked && (
                <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                  {pointerType.current === "touch" ? "Tap again" : "Click"} to view this day
                </p>
              )}
            </div>
          )}
        </div>

        <div
          aria-hidden="true"
          className="col-start-2 mt-2 flex justify-between text-[11px] tabular-nums text-muted-foreground"
        >
          {[...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])].map(
            (index) => (
              <span key={index}>{formatDay(points[index].day)}</span>
            )
          )}
        </div>
      </div>
    </figure>
  )
}
