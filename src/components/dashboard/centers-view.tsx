import { useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowDownAZ, ArrowUpZA, Building2, ChevronRight, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { getCentersForUser } from "@/core/functions/center-functions"
import { centersQuery } from "./queries"

const PAGE_SIZE = 50
const ALL = "all"

export function CentersView({ isSuperadmin }: { isSuperadmin: boolean }) {
  const search = useSearch({ from: "/dashboard" })
  const navigate = useNavigate({ from: "/dashboard" })
  const { data: centers = [], isLoading, error } = useQuery(centersQuery)

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const states = [...new Set(centers.map((c) => c.state?.name).filter(Boolean))].sort() as string[]
  const sectors = [...new Set(centers.map((c) => c.sector).filter(Boolean))].sort()

  const query = (search.q ?? "").trim().toLowerCase()
  const filtered = centers
    .filter(
      (c) =>
        (!query ||
          [c.dialysisCenterName, c.town, c.address].some((v) =>
            (v ?? "").toLowerCase().includes(query)
          )) &&
        (!search.state || c.state?.name === search.state) &&
        (!search.sector || c.sector === search.sector) &&
        (!search.featured || c.featured)
    )
    .sort((a, b) =>
      (a.dialysisCenterName ?? "").localeCompare(b.dialysisCenterName ?? "") *
      (search.sort === "desc" ? -1 : 1)
    )

  const hasFilters = !!(query || search.state || search.sector || search.featured)
  const filterKey = [query, search.state, search.sector, search.featured, search.sort].join("|")

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search centers"
            placeholder="Search name, town or address"
            value={search.q ?? ""}
            onChange={(e) => setSearch({ q: e.target.value || undefined })}
            className="h-9 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="State"
            allLabel="All states"
            value={search.state}
            options={states}
            onChange={(state) => setSearch({ state })}
          />
          {sectors.length > 0 && (
            <FilterSelect
              label="Sector"
              allLabel="All sectors"
              value={search.sector}
              options={sectors}
              onChange={(sector) => setSearch({ sector })}
            />
          )}
          <Button
            variant={search.featured ? "secondary" : "outline"}
            className="h-9"
            aria-pressed={!!search.featured}
            onClick={() => setSearch({ featured: search.featured ? undefined : true })}
          >
            Featured
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label={search.sort === "desc" ? "Sort A to Z" : "Sort Z to A"}
            title={search.sort === "desc" ? "Name Z–A" : "Name A–Z"}
            onClick={() => setSearch({ sort: search.sort === "desc" ? undefined : "desc" })}
          >
            {search.sort === "desc" ? <ArrowUpZA /> : <ArrowDownAZ />}
          </Button>
          {isSuperadmin && (
            <Button asChild className="h-9">
              <Link to="/centers/$centerId" params={{ centerId: "new" }}>
                <Plus />
                Add center
              </Link>
            </Button>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="tabular-nums" aria-live="polite">
            {filtered.length} of {centers.length} centers
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() =>
              setSearch({ q: undefined, state: undefined, sector: undefined, featured: undefined })
            }
          >
            Clear filters
          </Button>
        </div>
      )}

      {error ? (
        <p className="rounded-lg border p-8 text-center text-destructive">
          {error.message || "Failed to load dialysis centers."}
        </p>
      ) : isLoading ? (
        <div className="divide-y rounded-lg border bg-card">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="size-10 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hasFilters ? "No centers match these filters." : "No dialysis centers assigned to you yet."}
        </p>
      ) : (
        <CenterList key={filterKey} centers={filtered} />
      )}
    </div>
  )
}

type Center = Awaited<ReturnType<typeof getCentersForUser>>[number]

function CenterList({ centers }: { centers: Center[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="hidden grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_1.5rem] gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
          <span />
          <span>Name</span>
          <span>Location</span>
          <span>Sector</span>
          <span />
        </div>
        <ul className="divide-y">
          {centers.slice(0, visible).map((center) => {
            const image = center.images?.[0]
            const location = [center.town, center.state?.name].filter(Boolean).join(" · ")
            return (
              <li key={center.id}>
                <Link
                  to="/centers/$centerId"
                  params={{ centerId: center.id }}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)_1.5rem] items-center gap-3 px-3 py-2.5 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_1.5rem] md:gap-4 md:px-4"
                >
                  {image ? (
                    <img
                      src={image.url}
                      alt=""
                      loading="lazy"
                      className="size-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Building2 className="size-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {center.dialysisCenterName || "Unnamed center"}
                      </span>
                      {center.featured && <Badge className="shrink-0">Featured</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground md:hidden">
                      {[location, center.sector].filter(Boolean).join(" · ") || "-"}
                    </p>
                  </div>
                  <span className="hidden truncate text-sm text-muted-foreground md:block">
                    {location || "-"}
                  </span>
                  <span className="hidden truncate text-sm text-muted-foreground md:block">
                    {center.sector || "-"}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
      {visible < centers.length && (
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            Showing {visible} of {centers.length}
          </span>
          <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Show more
          </Button>
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string
  allLabel: string
  value: string | undefined
  options: string[]
  onChange: (value: string | undefined) => void
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger aria-label={label} className="data-[size=default]:h-9 min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
