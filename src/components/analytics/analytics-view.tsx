import { useRef, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getAnalyticsBranches,
  getAnalyticsOverview,
} from "@/core/functions/analytics-functions"
import { ANALYTICS_PERIODS, type AnalyticsPeriod } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { BranchList } from "./branch-list"
import {
  contactRate,
  formatDay,
  formatMytDateTime,
  formatNumber,
  formatRate,
} from "./format"
import { TrendChart } from "./trend-chart"

const PUBLIC_SITE_URL = "https://www.dialisis.my"

export function AnalyticsView() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(30)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const branchesQuery = useQuery({
    queryKey: ["analytics", "branches", period],
    queryFn: () => getAnalyticsBranches({ data: { period } }),
    placeholderData: (previous) => previous,
  })
  const overviewQuery = useQuery({
    queryKey: ["analytics", "overview", period, selectedId],
    queryFn: () =>
      getAnalyticsOverview({
        data: { period, centerId: selectedId ?? undefined },
      }),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[3] === selectedId ? previous : undefined,
  })

  const branches = branchesQuery.data
  const overview = overviewQuery.data
  const isChain = (branches?.length ?? 0) > 1
  const selected =
    branches?.find((branch) => branch.id === selectedId) ??
    (branches?.length === 1 ? branches[0] : null)

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
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
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
                  : `${formatNumber(branches.length)} centers`}
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
        </div>
        <div
          role="group"
          aria-label="Reporting period"
          className="flex shrink-0 gap-1 rounded-lg border bg-card p-1"
        >
          {ANALYTICS_PERIODS.map((days) => (
            <Button
              key={days}
              variant={days === period ? "secondary" : "ghost"}
              aria-pressed={days === period}
              onClick={() => setPeriod(days)}
              className="h-9 flex-1 px-4 md:flex-none"
            >
              {days} days
            </Button>
          ))}
        </div>
      </header>

      {!overview ? (
        <OverviewSkeleton />
      ) : !overview.hasData ? (
        <Card>
          <CardContent>
            <h3 className="text-lg font-medium">No visitor data yet</h3>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Tracking started recently. Page views and contacts for{" "}
              {selected ? "this center" : "your centers"} will appear here as
              visitors arrive on dialisis.my. Check back in a few days.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Overview overview={overview} period={period} />
      )}

      {isChain && !selected && branches && (
        <BranchList branches={branches} onSelect={selectBranch} />
      )}

      <p className="max-w-3xl text-xs text-muted-foreground">
        Each visitor is counted once per center per day (Malaysia time). Page
        views include repeat visits on the same day; contacts count once per
        visitor, method and day. Intake leads exclude test submissions and
        leads still marked new after 48 hours, and repeat forms from the same
        phone on the same day count once. Today is included, so its numbers
        are still growing.
      </p>
    </div>
  )
}

type OverviewData = Awaited<ReturnType<typeof getAnalyticsOverview>>

function Overview({
  overview,
  period,
}: {
  overview: OverviewData
  period: AnalyticsPeriod
}) {
  const { current, previous, comparable } = overview
  const contacts = current.call + current.whatsapp + current.directions
  const previousContacts =
    previous.call + previous.whatsapp + previous.directions
  const rate = contactRate(current.contactVisitors, current.visitors)
  const previousRate = contactRate(previous.contactVisitors, previous.visitors)
  const rateChange = Math.round((rate - previousRate) * 1000) / 10
  const rateComparable = comparable.views && comparable.contacts
  const contactKinds = [
    { label: "WhatsApp", short: "WhatsApp", value: current.whatsapp },
    { label: "Phone call", short: "Call", value: current.call },
    { label: "Directions", short: "Directions", value: current.directions },
  ]
  const contactMax = Math.max(...contactKinds.map((kind) => kind.value))
  const sourceMax = overview.sources[0]?.value ?? 0

  return (
    <>
      <section aria-label="Summary">
        <p className="mb-2 text-sm text-muted-foreground">
          {comparable.views
            ? `Compared with the previous ${period} days`
            : `Change vs the previous ${period} days appears once there's enough history`}
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
          <h3 className="text-base font-medium">Daily trend</h3>
          <div className="mt-4 grid gap-8 lg:grid-cols-2">
            <TrendChart
              title="Page views"
              unit="views"
              barClassName="bg-primary"
              points={overview.daily.map((point) => ({
                day: point.day,
                value: point.views,
              }))}
            />
            <TrendChart
              title="Contacts"
              unit="contacts"
              barClassName="bg-chart-4"
              points={overview.daily.map((point) => ({
                day: point.day,
                value: point.contacts,
              }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="text-base font-medium">How visitors made contact</h3>
            <ul className="mt-4 space-y-4">
              {contactKinds.map((kind) => (
                <BarRow
                  key={kind.label}
                  label={kind.label}
                  value={kind.value}
                  max={contactMax}
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
              <ul className="mt-4 space-y-4">
                {overview.sources.map((source) => (
                  <BarRow
                    key={`${source.label}|${source.sub}`}
                    label={source.label}
                    sub={source.sub}
                    value={source.value}
                    max={sourceMax}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
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
}: {
  label: string
  sub?: string
  value: number
  max: number
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0">
          <span className="font-medium">{label}</span>
          {sub && (
            <span className="block truncate text-xs text-muted-foreground">
              {sub}
            </span>
          )}
        </span>
        <span className="text-sm tabular-nums">{formatNumber(value)}</span>
      </div>
      <div aria-hidden="true" className="mt-1.5 h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-chart-4"
          style={{ width: max > 0 ? `${(value / max) * 100}%` : 0 }}
        />
      </div>
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
