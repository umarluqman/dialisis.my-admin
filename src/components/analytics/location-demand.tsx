import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getLocationDemand } from "@/core/functions/analytics-functions"
import type { AnalyticsRange } from "@/lib/analytics"
import { defineCopy, useCopy } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { formatNumber } from "./format"

const INITIAL_LIMIT = 20
const COLUMNS = "grid-cols-[minmax(0,1fr)_repeat(3,4.5rem)] md:grid-cols-[minmax(0,1fr)_repeat(3,6rem)_6rem]"

const COPY = defineCopy({
  en: {
    title: "Location page demand",
    description: "Views of /lokasi pages, ranked. Use it to pick towns to sell featured slots in.",
    level: "Location level",
    towns: "Towns",
    states: "States",
    town: "Town",
    state: "State",
    views: "Views",
    visitors: "Visitors",
    centers: "Centers",
    featured: "Featured",
    loading: "Loading...",
    empty: "No location page views in this period yet.",
    taken: "Taken",
    open: "Open",
    showTop: (limit: number) => `Show top ${limit} only`,
    showAll: (count: string) => `Show all ${count}`,
  },
  ms: {
    title: "Permintaan halaman lokasi",
    description: "Paparan halaman /lokasi, disusun daripada yang tertinggi. Gunakan untuk memilih bandar bagi menjual slot pilihan.",
    level: "Peringkat lokasi",
    towns: "Bandar",
    states: "Negeri",
    town: "Bandar",
    state: "Negeri",
    views: "Paparan",
    visitors: "Pelawat",
    centers: "Pusat",
    featured: "Pilihan",
    loading: "Memuatkan...",
    empty: "Belum ada paparan halaman lokasi dalam tempoh ini.",
    taken: "Diambil",
    open: "Tersedia",
    showTop: (limit: number) => `Lihat ${limit} teratas sahaja`,
    showAll: (count: string) => `Lihat semua ${count}`,
  },
})

export function LocationDemand({
  range,
  state,
}: {
  range: AnalyticsRange
  state?: string
}) {
  const t = useCopy(COPY)
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
            {t.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t.description}
          </p>
        </div>
        <div role="group" aria-label={t.level} className="flex gap-1 rounded-lg border bg-card p-1">
          {(["town", "state"] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={level === value ? "secondary" : "ghost"}
              aria-pressed={level === value}
              onClick={() => setLevel(value)}
            >
              {value === "town" ? t.towns : t.states}
            </Button>
          ))}
        </div>
      </div>

      <div
        aria-hidden="true"
        className={cn("grid gap-3 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground md:px-5", COLUMNS)}
      >
        <span>{level === "town" ? t.town : t.state}</span>
        <span className="text-right">{t.views}</span>
        <span className="text-right">{t.visitors}</span>
        <span className="text-right">{t.centers}</span>
        <span className="hidden text-right md:block">{t.featured}</span>
      </div>

      {isLoading ? (
        <p className="p-6 text-center text-muted-foreground">{t.loading}</p>
      ) : rows.length === 0 ? (
        <p className="p-6 text-center text-muted-foreground">{t.empty}</p>
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
                  <Badge variant="secondary">{t.taken}</Badge>
                ) : (
                  <Badge variant="outline">{t.open}</Badge>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}

      {rows.length > INITIAL_LIMIT && (
        <div className="border-t p-3 text-center">
          <Button variant="outline" className="h-9" onClick={() => setShowAll(!showAll)}>
            {showAll ? t.showTop(INITIAL_LIMIT) : t.showAll(formatNumber(rows.length))}
          </Button>
        </div>
      )}
    </Card>
  )
}
