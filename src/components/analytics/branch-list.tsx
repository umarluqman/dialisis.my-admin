import { useMemo, useState } from "react"
import { ChevronRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AnalyticsBranch } from "@/core/functions/analytics-functions"
import { cn } from "@/lib/utils"
import { contactRate, formatNumber, formatRate } from "./format"

const SORTS = [
  { value: "views", label: "Views" },
  { value: "contacts", label: "Contacts" },
  { value: "rate", label: "Contact rate" },
  { value: "leads", label: "Leads" },
] as const

type SortKey = (typeof SORTS)[number]["value"]

const ALL_STATES = "all"
const INITIAL_LIMIT = 10
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_repeat(4,6.5rem)_1.25rem]"

function sortValue(branch: AnalyticsBranch, sort: SortKey) {
  if (sort === "rate") return contactRate(branch.contactVisitors, branch.visitors)
  return branch[sort]
}

function attentionLabel(branch: AnalyticsBranch) {
  if (branch.views === 0) return "No views"
  if (branch.contacts === 0) return "No contacts"
  return null
}

export function BranchList({
  branches,
  onSelect,
}: {
  branches: AnalyticsBranch[]
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [stateFilter, setStateFilter] = useState(ALL_STATES)
  const [sort, setSort] = useState<SortKey>("views")
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const states = useMemo(
    () =>
      Array.from(new Set(branches.map((branch) => branch.state)))
        .filter(Boolean)
        .sort(),
    [branches]
  )
  const attentionCount = branches.filter(attentionLabel).length

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return branches
      .filter(
        (branch) =>
          (!needle ||
            branch.name.toLowerCase().includes(needle) ||
            branch.town.toLowerCase().includes(needle)) &&
          (stateFilter === ALL_STATES || branch.state === stateFilter) &&
          (!attentionOnly || attentionLabel(branch))
      )
      .sort(
        (a, b) => sortValue(b, sort) - sortValue(a, sort) || b.views - a.views
      )
  }, [branches, query, stateFilter, sort, attentionOnly])

  const isFiltering = Boolean(
    query.trim() || stateFilter !== ALL_STATES || attentionOnly
  )
  const visible =
    showAll || isFiltering ? filtered : filtered.slice(0, INITIAL_LIMIT)
  const max = Math.max(...filtered.map((branch) => sortValue(branch, sort)), 0)

  return (
    <Card className="gap-0 py-0" aria-labelledby="branch-list-heading" role="region">
      <div className="border-b p-4 md:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="branch-list-heading" className="text-base font-medium">
            Center performance
          </h3>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatNumber(filtered.length)} of {formatNumber(branches.length)}{" "}
            centers
          </p>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
          <label className="relative block">
            <span className="sr-only">Search centers</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or town"
              className="h-10 pl-9"
            />
          </label>
          {states.length > 1 && (
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger
                aria-label="Filter by state"
                className="h-10! w-full md:w-52"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value={ALL_STATES}>All states</SelectItem>
                {states.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted-foreground">Sort by</span>
          {SORTS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={sort === option.value ? "secondary" : "ghost"}
              aria-pressed={sort === option.value}
              onClick={() => setSort(option.value)}
              className="h-9 px-3"
            >
              {option.label}
            </Button>
          ))}
          {attentionCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant={attentionOnly ? "secondary" : "outline"}
              aria-pressed={attentionOnly}
              onClick={() => setAttentionOnly(!attentionOnly)}
              className="h-9 px-3 md:ml-auto"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-destructive"
              />
              Needs attention
              <span className="tabular-nums text-muted-foreground">
                {formatNumber(attentionCount)}
              </span>
            </Button>
          )}
        </div>
      </div>

      <div
        aria-hidden="true"
        className={cn(
          "hidden gap-4 border-b px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid",
          COLUMNS
        )}
      >
        <span>Center</span>
        <span className="text-right">Views</span>
        <span className="text-right">Contacts</span>
        <span className="text-right">Contact rate</span>
        <span className="text-right">Leads</span>
      </div>

      {visible.length === 0 ? (
        <p className="p-6 text-center text-muted-foreground">
          No centers match your filters.
        </p>
      ) : (
        <ul className="divide-y">
          {visible.map((branch) => {
            const attention = attentionLabel(branch)
            const value = sortValue(branch, sort)
            return (
              <li key={branch.id}>
                <button
                  type="button"
                  onClick={() => onSelect(branch.id)}
                  className={cn(
                    "group grid w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none md:items-center md:gap-4 md:px-5",
                    COLUMNS
                  )}
                >
                  <span className="block min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium group-hover:underline">
                        {branch.name}
                      </span>
                      {attention && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-destructive"
                          />
                          {attention}
                        </span>
                      )}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {[branch.town, branch.state].filter(Boolean).join(", ")}
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-2 block h-1.5 rounded-full bg-muted"
                    >
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: max > 0 ? `${(value / max) * 100}%` : 0 }}
                      />
                    </span>
                  </span>
                  <span className="grid grid-cols-4 gap-2 md:contents">
                    <Stat label="Views" value={formatNumber(branch.views)} active={sort === "views"} />
                    <Stat label="Contacts" value={formatNumber(branch.contacts)} active={sort === "contacts"} />
                    <Stat
                      label="Rate"
                      value={formatRate(contactRate(branch.contactVisitors, branch.visitors))}
                      active={sort === "rate"}
                    />
                    <Stat label="Leads" value={formatNumber(branch.leads)} active={sort === "leads"} />
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="hidden size-5 text-muted-foreground group-hover:text-foreground md:block"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!isFiltering && filtered.length > INITIAL_LIMIT && (
        <div className="border-t p-3 text-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="h-9"
          >
            {showAll
              ? `Show top ${INITIAL_LIMIT} only`
              : `Show all ${formatNumber(filtered.length)} centers`}
          </Button>
        </div>
      )}
    </Card>
  )
}

function Stat({
  label,
  value,
  active,
}: {
  label: string
  value: string
  active: boolean
}) {
  return (
    <span className="block md:text-right">
      <span className="block text-xs text-muted-foreground md:sr-only">
        {label}
      </span>
      <span
        className={cn(
          "block text-sm tabular-nums",
          active && "font-semibold"
        )}
      >
        {value}
      </span>
    </span>
  )
}
