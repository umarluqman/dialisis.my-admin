import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getLocationDemand } from "@/core/functions/analytics-functions"
import type { AnalyticsRange } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { formatNumber } from "./format"

const INITIAL_LIMIT = 20
const COLUMNS = "grid-cols-[minmax(0,1fr)_repeat(3,4.5rem)] md:grid-cols-[minmax(0,1fr)_repeat(3,6rem)_6rem]"

export function LocationDemand({
  range,
  state,
}: {
  range: AnalyticsRange
  state?: string
}) {
  const [level, setLevel] = useState<"town" | "state">("town")
  const [showAll, setShowAll] = useState(false)
  const { data = [], isLoading } = useQuery({
    queryKey: ["analytics", "locations", range],
    queryFn: () => getLocationDemand({ data: range }),
  })

  const rows = data.filter(
    (row) =>
      (level === "town" ? row.town : !row.town) && (!state || row.stateName === state)
  )
  const visible = showAll ? rows : rows.slice(0, INITIAL_LIMIT)

  return (
    <Card className="gap-0 py-0" role="region" aria-labelledby="location-demand-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 md:p-5">
        <div>
          <h3 id="location-demand-heading" className="text-base font-medium">
            Location page demand
          </h3>
          <p className="text-sm text-muted-foreground">
            Views of /lokasi pages, ranked. Use it to pick towns to sell featured slots in.
          </p>
        </div>
        <div role="group" aria-label="Location level" className="flex gap-1 rounded-lg border bg-card p-1">
          {(["town", "state"] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={level === value ? "secondary" : "ghost"}
              aria-pressed={level === value}
              onClick={() => setLevel(value)}
            >
              {value === "town" ? "Towns" : "States"}
            </Button>
          ))}
        </div>
      </div>

      <div
        aria-hidden="true"
        className={cn("grid gap-3 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground md:px-5", COLUMNS)}
      >
        <span>{level === "town" ? "Town" : "State"}</span>
        <span className="text-right">Views</span>
        <span className="text-right">Visitors</span>
        <span className="text-right">Centers</span>
        <span className="hidden text-right md:block">Featured</span>
      </div>

      {isLoading ? (
        <p className="p-6 text-center text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="p-6 text-center text-muted-foreground">No location page views in this period yet.</p>
      ) : (
        <ol className="divide-y">
          {visible.map((row, index) => (
            <li
              key={`${row.stateId}|${row.town}`}
              className={cn("grid items-center gap-3 px-4 py-3 text-sm md:px-5", COLUMNS)}
            >
              <span className="min-w-0">
                <span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>
                <span className="font-medium">{row.town || row.stateName}</span>
                {row.town && <span className="block text-muted-foreground">{row.stateName}</span>}
              </span>
              <span className="text-right tabular-nums">{formatNumber(row.views)}</span>
              <span className="text-right tabular-nums">{formatNumber(row.visitors)}</span>
              <span className="text-right tabular-nums">{formatNumber(row.centers)}</span>
              <span className="hidden text-right md:block">
                {row.slotTaken ? (
                  <Badge variant="secondary">Taken</Badge>
                ) : (
                  <Badge variant="outline">Open</Badge>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}

      {rows.length > INITIAL_LIMIT && (
        <div className="border-t p-3 text-center">
          <Button variant="outline" className="h-9" onClick={() => setShowAll(!showAll)}>
            {showAll ? `Show top ${INITIAL_LIMIT} only` : `Show all ${formatNumber(rows.length)}`}
          </Button>
        </div>
      )}
    </Card>
  )
}
