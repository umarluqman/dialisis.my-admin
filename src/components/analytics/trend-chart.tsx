import { cn } from "@/lib/utils"
import { formatDay, formatNumber } from "./format"

type Point = { day: string; value: number | null }

export function TrendChart({
  title,
  unit,
  points,
  barClassName,
}: {
  title: string
  unit: string
  points: Point[]
  barClassName: string
}) {
  const tracked = points.filter(
    (point): point is { day: string; value: number } => point.value !== null
  )
  const untracked = points.length - tracked.length
  const max = Math.max(...tracked.map((point) => point.value), 0)
  const total = tracked.reduce((sum, point) => sum + point.value, 0)
  const peak = tracked.find((point) => point.value === max)
  const summary =
    max === 0
      ? `${title}: no data in this period.`
      : `${title}: ${formatNumber(total)} ${unit} in total, peak of ${formatNumber(max)} on ${formatDay(peak!.day)}.`

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          Peak {formatNumber(max)}
        </span>
      </figcaption>
      <p className="sr-only">{summary}</p>
      <div
        aria-hidden="true"
        className={cn(
          "mt-3 flex h-28 items-end border-b",
          points.length > 40 ? "gap-px" : "gap-1"
        )}
      >
        {untracked > 0 && (
          <div
            title={`${formatDay(points[0].day)} – ${formatDay(points[untracked - 1].day)}: not tracked yet`}
            className="flex h-full items-center justify-center overflow-hidden rounded-t-[3px] bg-muted/60 bg-[repeating-linear-gradient(135deg,var(--border)_0_1px,transparent_1px_7px)] px-1 text-center text-[11px] text-muted-foreground"
            style={{ flexGrow: untracked, flexBasis: 0 }}
          >
            Not tracked yet
          </div>
        )}
        {tracked.map((point) => (
          <div
            key={point.day}
            title={`${formatDay(point.day)}: ${formatNumber(point.value)} ${unit}`}
            className="flex h-full flex-1 items-end rounded-t-[3px] hover:bg-muted"
          >
            <div
              className={cn(
                "w-full rounded-t-[3px]",
                point.value > 0 ? barClassName : "bg-border"
              )}
              style={{
                height:
                  point.value > 0
                    ? `${Math.max((point.value / max) * 100, 3)}%`
                    : "2px",
              }}
            />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="mt-2 flex justify-between text-[11px] tabular-nums text-muted-foreground"
      >
        {[0, Math.floor((points.length - 1) / 2), points.length - 1].map(
          (index) => (
            <span key={index}>{formatDay(points[index].day)}</span>
          )
        )}
      </div>
    </figure>
  )
}
