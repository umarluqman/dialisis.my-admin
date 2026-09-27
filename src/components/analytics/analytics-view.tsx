import { useRef, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getAnalyticsBranches,
  getAnalyticsOverview,
  getTownComparison,
} from "@/core/functions/analytics-functions"
import {
  CONTACT_KINDS,
  CONTACT_LABELS,
  DEFAULT_PRESET,
  isValidRange,
  presetRange,
  rangeLength,
  SOURCE_LABELS,
  toMytDay,
  type AnalyticsRange,
} from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { AnalyticsFilters, type AnalyticsSearch } from "./analytics-filters"
import { BranchList } from "./branch-list"
import { LocationDemand } from "./location-demand"
import {
  CONTACT_COLORS,
  contactRate,
  formatDay,
  formatMytDateTime,
  formatNumber,
  formatRate,
} from "./format"
import { TrendChart } from "./trend-chart"

const PUBLIC_SITE_URL = "https://www.dialisis.my"

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values)).filter(Boolean).sort()

export function AnalyticsView({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { days, from, to, state, town, contact, source } = useSearch({
    from: "/dashboard",
  })
  const navigate = useNavigate({ from: "/dashboard" })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const filters: AnalyticsSearch = { days, from, to, state, town, contact, source }
  const customRange = from && to && isValidRange({ from, to }) ? { from, to } : null
  const range = customRange ?? presetRange(days ?? DEFAULT_PRESET)
  const contactFilter = { contact, source }
  const location = selectedId ? {} : { state, town }

  const updateFilters = (patch: AnalyticsSearch) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), resetScroll: false })

  const branchesQuery = useQuery({
    queryKey: ["analytics", "branches", range, contactFilter],
    queryFn: () => getAnalyticsBranches({ data: { ...range, ...contactFilter } }),
    placeholderData: (previous) => previous,
  })
  const overviewQuery = useQuery({
    queryKey: ["analytics", "overview", range, contactFilter, location, selectedId],
    queryFn: () =>
      getAnalyticsOverview({
        data: {
          ...range,
          ...contactFilter,
          ...location,
          centerId: selectedId ?? undefined,
        },
      }),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[5] === selectedId ? previous : undefined,
  })

  const branches = branchesQuery.data
  const overview = overviewQuery.data
  const isChain = (branches?.length ?? 0) > 1
  const selected =
    branches?.find((branch) => branch.id === selectedId) ??
    (branches?.length === 1 ? branches[0] : null)

  const states = selected ? [] : uniqueSorted(branches?.map((branch) => branch.state) ?? [])
  const stateBranches =
    branches?.filter((branch) => !state || branch.state === state) ?? []
  const towns =
    selected || (!state && states.length > 1)
      ? []
      : uniqueSorted(stateBranches.map((branch) => branch.town))
  const visibleBranches = stateBranches.filter(
    (branch) => !town || branch.town === town
  )

  const selectBranch = (id: string | null) => {
    setSelectedId(id)
    topRef.current?.scrollIntoView({ block: "start" })
  }

  if (branchesQuery.isError || overviewQuery.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">
            We couldn't load visitor analytics. Please try again.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              branchesQuery.refetch()
              overviewQuery.refetch()
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (branches?.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-medium">No centers yet</h2>
          <p className="mt-1 text-muted-foreground">
            Analytics appear here once a center is assigned to your account.
          </p>
        </CardContent>
      </Card>
    )
  }

  const isFiltered = Object.values(filters).some((value) => value !== undefined)

  return (
    <div ref={topRef} className="scroll-mt-20 space-y-4">
      {overview && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Badge variant="outline" className="bg-card">
            New feature
          </Badge>
          <span>
            Page views tracked since{" "}
            <span className="text-foreground tabular-nums">
              {formatMytDateTime(overview.trackedSince.views)}
            </span>
            {" · "}
            Contacts and leads since{" "}
            <span className="text-foreground tabular-nums">
              {formatMytDateTime(overview.trackedSince.contacts)}
            </span>{" "}
            (Malaysia time).
          </span>
        </p>
      )}
      <header className="min-w-0">
        {selected && isChain && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectBranch(null)}
            className="mb-3"
          >
            <ArrowLeft />
            All centers
          </Button>
        )}
        {branches ? (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">
              {selected ? selected.name : "Visitor analytics"}
            </h2>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
              {selected
                ? [selected.town, selected.state].filter(Boolean).join(", ")
                : `${formatNumber(visibleBranches.length)} centers${
                    town || state ? ` in ${[town, state].filter(Boolean).join(", ")}` : ""
                  }`}
              {overview &&
                ` · ${formatDay(overview.startDay)}${overview.startDay < overview.endDay ? ` – ${formatDay(overview.endDay)}` : ""}`}
            </p>
          </>
        ) : (
          <>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-40" />
          </>
        )}
        {selected && (
          <Button variant="link" asChild className="mt-1 h-auto px-0 text-foreground underline">
            <a
              href={`${PUBLIC_SITE_URL}/${selected.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View public page
              <ExternalLink />
            </a>
          </Button>
        )}
      </header>

      <AnalyticsFilters
        search={filters}
        range={range}
        activePreset={customRange ? null : (days ?? DEFAULT_PRESET)}
        minDay={overview && toMytDay(Date.parse(overview.trackedSince.contacts))}
        states={states}
        towns={towns}
        onChange={updateFilters}
      />

      {!overview ? (
        <OverviewSkeleton />
      ) : !overview.hasData ? (
        <Card>
          <CardContent>
            {isFiltered ? (
              <>
                <h3 className="text-lg font-medium">Nothing matches these filters</h3>
                <p className="mt-1 max-w-2xl text-muted-foreground">
                  No page views, contacts or leads for this date range and filter
                  combination. Try a longer range or reset the filters.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium">No visitor data yet</h3>
                <p className="mt-1 max-w-2xl text-muted-foreground">
                  Tracking started recently. Page views and contacts for{" "}
                  {selected ? "this center" : "your centers"} will appear here as
                  visitors arrive on dialisis.my. Check back in a few days.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            "space-y-4 transition-opacity",
            overviewQuery.isPlaceholderData && "opacity-60"
          )}
        >
          <Overview
            overview={overview}
            range={range}
            filters={filters}
            onFilter={updateFilters}
          />
        </div>
      )}

      {selected && <TownComparison centerId={selected.id} range={range} />}

      {isChain && !selected && branches && (
        <BranchList branches={visibleBranches} onSelect={selectBranch} />
      )}

      {isSuperadmin && !selected && <LocationDemand range={range} state={state} />}

      <p className="max-w-3xl text-xs text-muted-foreground">
        Each visitor is counted once per center per day (Malaysia time). Page
        views include repeat visits on the same day; contacts count once per
        visitor, method and day. Intake leads exclude test submissions and
        leads still marked new after 48 hours, and repeat forms from the same
        phone on the same day count once. Contact type and source page filters
        narrow contacts and contact rate only; page views and leads aren't tied
        to either. Today is included, so its numbers are still growing.
      </p>
    </div>
  )
}

type OverviewData = Awaited<ReturnType<typeof getAnalyticsOverview>>

function Overview({
  overview,
  range,
  filters,
  onFilter,
}: {
  overview: OverviewData
  range: AnalyticsRange
  filters: AnalyticsSearch
  onFilter: (patch: AnalyticsSearch) => void
}) {
  const { current, previous, comparable } = overview
  const contacts = current.call + current.whatsapp + current.directions
  const previousContacts =
    previous.call + previous.whatsapp + previous.directions
  const rate = contactRate(current.contactVisitors, current.visitors)
  const previousRate = contactRate(previous.contactVisitors, previous.visitors)
  const rateChange = Math.round((rate - previousRate) * 1000) / 10
  const rateComparable = comparable.views && comparable.contacts
  const contactKinds = CONTACT_KINDS.map((kind) => ({
    kind,
    label: CONTACT_LABELS[kind],
    short: kind === "call" ? "Call" : CONTACT_LABELS[kind],
    value: current[kind],
  }))
  const contactMax = Math.max(...contactKinds.map((kind) => kind.value))
  const length = rangeLength(range)
  const previousLabel = length === 1 ? "the previous day" : `the previous ${length} days`
  const { impressions, clicks } = overview.featured
  const sourceMax = overview.sources[0]?.value ?? 0

  return (
    <>
      <section aria-label="Summary">
        <p className="mb-2 text-sm text-muted-foreground">
          {comparable.views
            ? `Compared with ${previousLabel}`
            : `Change vs ${previousLabel} appears once there's enough history`}
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi
            label="Page views"
            value={formatNumber(current.views)}
            delta={
              comparable.views && (
                <Delta current={current.views} previous={previous.views} />
              )
            }
          >
            Times the center page was opened.
          </Kpi>
          <Kpi
            label="Unique visitors"
            value={formatNumber(current.visitors)}
            delta={
              comparable.views && (
                <Delta current={current.visitors} previous={previous.visitors} />
              )
            }
          >
            Different people viewing, per day.
          </Kpi>
          <Kpi
            label="Contacts"
            value={formatNumber(contacts)}
            delta={
              comparable.contacts && (
                <Delta current={contacts} previous={previousContacts} />
              )
            }
          >
            <span className="flex flex-wrap gap-x-3">
              {contactKinds.map((kind) => (
                <span key={kind.label} className="whitespace-nowrap">
                  {kind.short}{" "}
                  <span className="tabular-nums text-foreground">
                    {formatNumber(kind.value)}
                  </span>
                </span>
              ))}
            </span>
          </Kpi>
          <Kpi
            label="Contact rate"
            value={formatRate(rate)}
            delta={
              rateComparable &&
              previous.visitors > 0 && (
                <DeltaText
                  change={rateChange}
                  text={`${Math.abs(rateChange).toFixed(1)} pts`}
                />
              )
            }
          >
            Visitors who went on to contact.
          </Kpi>
          <Kpi
            label="Intake leads"
            className="col-span-2 lg:col-span-1"
            value={formatNumber(current.leads)}
            delta={
              comparable.leads && (
                <Delta current={current.leads} previous={previous.leads} />
              )
            }
          >
            <span className="tabular-nums text-foreground">
              {formatNumber(current.booked)}
            </span>{" "}
            booked
            {current.followUp > 0 && (
              <Link
                to="/dashboard"
                search={{ tab: "follow-up" }}
                className="mt-1 block text-xs underline underline-offset-2 hover:text-foreground"
              >
                Excludes {formatNumber(current.followUp)} awaiting{" "}
                <span className="whitespace-nowrap">follow-up</span>
              </Link>
            )}
          </Kpi>
        </div>
      </section>

      <Card>
        <CardContent>
          <h3 className="mb-4 text-base font-medium">Daily trend</h3>
          <TrendChart
            points={overview.daily}
            contact={filters.contact}
            onSelectDay={(day) => onFilter({ from: day, to: day, days: undefined })}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="text-base font-medium">How visitors made contact</h3>
            <p className="mt-1 text-sm text-muted-foreground">Select one to filter.</p>
            <ul className="mt-3 space-y-1">
              {contactKinds.map((kind) => (
                <BarRow
                  key={kind.kind}
                  label={kind.label}
                  value={kind.value}
                  max={contactMax}
                  barClassName={CONTACT_COLORS[kind.kind]}
                  pressed={filters.contact === kind.kind}
                  onClick={() =>
                    onFilter({
                      contact: filters.contact === kind.kind ? undefined : kind.kind,
                    })
                  }
                />
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="text-base font-medium">Where contacts came from</h3>
            {overview.sources.length === 0 ? (
              <p className="mt-4 text-muted-foreground">
                No contacts in this period yet.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">Select one to filter.</p>
                <ul className="mt-3 space-y-1">
                  {overview.sources.map((source) => (
                    <BarRow
                      key={`${source.key}|${source.sub}`}
                      label={SOURCE_LABELS[source.key]}
                      sub={source.sub}
                      value={source.value}
                      max={sourceMax}
                      barClassName="bg-chart-4"
                      pressed={filters.source === source.key}
                      onClick={() =>
                        onFilter({
                          source: filters.source === source.key ? undefined : source.key,
                        })
                      }
                    />
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {impressions + clicks > 0 && (
        <Card>
          <CardContent>
            <h3 className="text-base font-medium">Featured placement</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Visitors who saw the featured card on location pages, and who opened it.
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-4">
              {[
                { label: "Impressions", value: formatNumber(impressions) },
                { label: "Clicks", value: formatNumber(clicks) },
                { label: "Click rate", value: formatRate(impressions > 0 ? clicks / impressions : 0) },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function TownComparison({
  centerId,
  range,
}: {
  centerId: string
  range: AnalyticsRange
}) {
  const { data } = useQuery({
    queryKey: ["analytics", "town", range, centerId],
    queryFn: () => getTownComparison({ data: { ...range, centerId } }),
  })

  if (!data) return null

  const average = Math.round(data.townAverage)
  const change =
    data.townAverage > 0
      ? Math.round(((data.views - data.townAverage) / data.townAverage) * 100)
      : null

  return (
    <Card>
      <CardContent>
        <h3 className="text-base font-medium">Compared with {data.town}</h3>
        <p className="mt-1 text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {formatNumber(data.views)}
          </span>{" "}
          page views vs a town average of{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatNumber(average)}
          </span>{" "}
          across {formatNumber(data.centers)} centers
          {change !== null &&
            (change === 0
              ? " (on par)."
              : ` (${Math.abs(change)}% ${change > 0 ? "above" : "below"}).`)}
        </p>
      </CardContent>
    </Card>
  )
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const change = Math.round(((current - previous) / previous) * 100)
  return <DeltaText change={change} text={`${Math.abs(change)}%`} />
}

function DeltaText({ change, text }: { change: number; text: string }) {
  if (change === 0) {
    return (
      <span className="text-xs text-muted-foreground">No change</span>
    )
  }
  return (
    <span
      className={cn(
        "text-xs font-medium tabular-nums",
        change > 0 ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <span aria-hidden="true">{change > 0 ? "▲" : "▼"}</span>
      <span className="sr-only">{change > 0 ? "up" : "down"}</span> {text}
    </span>
  )
}

function Kpi({
  label,
  value,
  delta,
  className,
  children,
}: {
  label: string
  value: string
  delta?: ReactNode
  className?: string
  children?: ReactNode
}) {
  return (
    <Card size="sm" className={className}>
      <CardContent>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-2xl font-semibold tabular-nums tracking-tight md:text-3xl">
            {value}
          </span>
          {delta}
        </p>
        {children && (
          <div className="mt-1.5 text-sm text-muted-foreground">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}

function BarRow({
  label,
  sub,
  value,
  max,
  barClassName,
  pressed,
  onClick,
}: {
  label: string
  sub?: string
  value: number
  max: number
  barClassName: string
  pressed: boolean
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={pressed}
        onClick={onClick}
        className={cn(
          "-mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
          pressed && "bg-muted"
        )}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0">
            <span className="font-medium">{label}</span>
            {sub && (
              <span className="block truncate text-xs text-muted-foreground">
                {sub}
              </span>
            )}
          </span>
          <span className="text-sm tabular-nums">{formatNumber(value)}</span>
        </span>
        <span aria-hidden="true" className="mt-1.5 block h-1.5 rounded-full bg-muted">
          <span
            className={cn("block h-full rounded-full", barClassName)}
            style={{ width: max > 0 ? `${(value / max) * 100}%` : 0 }}
          />
        </span>
      </button>
    </li>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading analytics">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton
            key={index}
            className={cn("h-32 rounded-xl", index === 4 && "col-span-2 lg:col-span-1")}
          />
        ))}
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </div>
  )
}
