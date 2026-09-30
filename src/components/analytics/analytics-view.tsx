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
  DEFAULT_PRESET,
  isValidRange,
  presetRange,
  rangeLength,
  toMytDay,
  type AnalyticsRange,
} from "@/lib/analytics"
import { defineCopy, useCopy, useLocale } from "@/lib/i18n"
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
  LABELS,
} from "./format"
import { TrendChart } from "./trend-chart"

const PUBLIC_SITE_URL = "https://www.dialisis.my"

const COPY = defineCopy({
  en: {
    loadError: "We couldn't load visitor analytics. Please try again.",
    retry: "Retry",
    noCenters: "No centers yet",
    noCentersBody: "Analytics appear here once a center is assigned to your account.",
    newFeature: "New feature",
    viewsSince: "Page views tracked since",
    contactsSince: "Contacts and leads since",
    mytNote: "(Malaysia time).",
    allCenters: "All centers",
    title: "Visitor analytics",
    centerCount: (count: string, place: string) =>
      `${count} centers${place ? ` in ${place}` : ""}`,
    viewPublicPage: "View public page",
    noMatch: "Nothing matches these filters",
    noMatchBody:
      "No page views, contacts or leads for this date range and filter combination. Try a longer range or reset the filters.",
    noData: "No visitor data yet",
    noDataBody: (selected: boolean) =>
      `Tracking started recently. Page views and contacts for ${selected ? "this center" : "your centers"} will appear here as visitors arrive on dialisis.my. Check back in a few days.`,
    footnote:
      "Each visitor is counted once per center per day (Malaysia time). Page views include repeat visits on the same day; contacts count once per visitor, method and day. Intake leads exclude test submissions and leads still marked new after 48 hours, and repeat forms from the same phone on the same day count once. Contact type and source page filters narrow contacts and contact rate only; page views and leads aren't tied to either. Today is included, so its numbers are still growing.",
    call: "Call",
    previous: (days: number) =>
      days === 1 ? "the previous day" : `the previous ${days} days`,
    comparedWith: (previous: string) => `Compared with ${previous}`,
    noComparison: (previous: string) =>
      `Change vs ${previous} appears once there's enough history`,
    summary: "Summary",
    pageViews: "Page views",
    pageViewsHint: "Times the center page was opened.",
    visitors: "Unique visitors",
    visitorsHint: "Different people viewing, per day.",
    contacts: "Contacts",
    contactRate: "Contact rate",
    points: (value: string) => `${value} pts`,
    contactRateHint: "Visitors who went on to contact.",
    leads: "Intake leads",
    booked: "booked",
    excludes: (count: string) => `Excludes ${count} awaiting`,
    followUp: "follow-up",
    dailyTrend: "Daily trend",
    contactMethods: "How visitors made contact",
    selectToFilter: "Select one to filter.",
    sources: "Where contacts came from",
    noContacts: "No contacts in this period yet.",
    featured: "Featured placement",
    featuredHint: "Visitors who saw the featured card on location pages, and who opened it.",
    impressions: "Impressions",
    clicks: "Clicks",
    clickRate: "Click rate",
    comparedWithTown: (town: string) => `Compared with ${town}`,
    townViews: "page views vs a town average of",
    across: (count: string) => `across ${count} centers`,
    onPar: " (on par).",
    townDiff: (percent: number, above: boolean) =>
      ` (${percent}% ${above ? "above" : "below"}).`,
    noChange: "No change",
    up: "up",
    down: "down",
    loading: "Loading analytics",
  },
  ms: {
    loadError: "Kami tidak dapat memuatkan analitik pelawat. Sila cuba lagi.",
    retry: "Cuba lagi",
    noCenters: "Belum ada pusat",
    noCentersBody: "Analitik akan dipaparkan di sini selepas pusat ditetapkan kepada akaun anda.",
    newFeature: "Ciri baru",
    viewsSince: "Paparan halaman dijejak sejak",
    contactsSince: "Hubungan dan permohonan sejak",
    mytNote: "(waktu Malaysia).",
    allCenters: "Semua pusat",
    title: "Analitik pelawat",
    centerCount: (count: string, place: string) =>
      `${count} pusat${place ? ` di ${place}` : ""}`,
    viewPublicPage: "Lihat halaman awam",
    noMatch: "Tiada yang sepadan dengan tapisan ini",
    noMatchBody:
      "Tiada paparan halaman, hubungan atau permohonan untuk julat tarikh dan gabungan tapisan ini. Cuba julat yang lebih panjang atau set semula tapisan.",
    noData: "Belum ada data pelawat",
    noDataBody: (selected: boolean) =>
      `Penjejakan baru sahaja bermula. Paparan halaman dan hubungan untuk ${selected ? "pusat ini" : "pusat anda"} akan dipaparkan di sini apabila pelawat mengunjungi dialisis.my. Semak semula dalam beberapa hari.`,
    footnote:
      "Setiap pelawat dikira sekali bagi setiap pusat sehari (waktu Malaysia). Paparan halaman termasuk lawatan berulang pada hari yang sama; hubungan dikira sekali bagi setiap pelawat, kaedah dan hari. Permohonan temujanji tidak termasuk penghantaran ujian dan permohonan yang masih berstatus baru selepas 48 jam, dan borang berulang daripada no. telefon yang sama pada hari yang sama dikira sekali. Tapisan jenis hubungan dan halaman sumber hanya mengehadkan hubungan dan kadar hubungan; paparan halaman dan permohonan tidak berkait dengan kedua-duanya. Hari ini turut dikira, jadi angkanya masih bertambah.",
    call: "Panggil",
    previous: (days: number) =>
      days === 1 ? "hari sebelumnya" : `${days} hari sebelumnya`,
    comparedWith: (previous: string) => `Berbanding ${previous}`,
    noComparison: (previous: string) =>
      `Perubahan berbanding ${previous} dipaparkan apabila data sejarah mencukupi`,
    summary: "Ringkasan",
    pageViews: "Paparan halaman",
    pageViewsHint: "Bilangan kali halaman pusat dibuka.",
    visitors: "Pelawat unik",
    visitorsHint: "Individu berbeza yang melihat, sehari.",
    contacts: "Hubungan",
    contactRate: "Kadar hubungan",
    points: (value: string) => `${value} mata`,
    contactRateHint: "Pelawat yang kemudian menghubungi pusat.",
    leads: "Permohonan temujanji",
    booked: "ditempah",
    excludes: (count: string) => `Tidak termasuk ${count} yang perlu`,
    followUp: "susulan",
    dailyTrend: "Trend harian",
    contactMethods: "Cara pelawat menghubungi pusat",
    selectToFilter: "Pilih satu untuk menapis.",
    sources: "Sumber hubungan",
    noContacts: "Belum ada hubungan dalam tempoh ini.",
    featured: "Penempatan pilihan",
    featuredHint: "Pelawat yang melihat kad pilihan di halaman lokasi, dan yang membukanya.",
    impressions: "Impresi",
    clicks: "Klik",
    clickRate: "Kadar klik",
    comparedWithTown: (town: string) => `Berbanding ${town}`,
    townViews: "paparan halaman berbanding purata bandar",
    across: (count: string) => `bagi ${count} pusat`,
    onPar: " (setara).",
    townDiff: (percent: number, above: boolean) =>
      ` (${percent}% ${above ? "lebih tinggi" : "lebih rendah"}).`,
    noChange: "Tiada perubahan",
    up: "naik",
    down: "turun",
    loading: "Memuatkan analitik",
  },
})

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values)).filter(Boolean).sort()

export function AnalyticsView({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { days, from, to, state, town, contact, source } = useSearch({
    from: "/dashboard",
  })
  const navigate = useNavigate({ from: "/dashboard" })
  const t = useCopy(COPY)
  const { locale } = useLocale()
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
            {t.loadError}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              branchesQuery.refetch()
              overviewQuery.refetch()
            }}
          >
            {t.retry}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (branches?.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-medium">{t.noCenters}</h2>
          <p className="mt-1 text-muted-foreground">
            {t.noCentersBody}
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
            {t.newFeature}
          </Badge>
          <span>
            {t.viewsSince}{" "}
            <span className="text-foreground tabular-nums">
              {formatMytDateTime(overview.trackedSince.views, locale)}
            </span>
            {" · "}
            {t.contactsSince}{" "}
            <span className="text-foreground tabular-nums">
              {formatMytDateTime(overview.trackedSince.contacts, locale)}
            </span>{" "}
            {t.mytNote}
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
            {t.allCenters}
          </Button>
        )}
        {branches ? (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">
              {selected ? selected.name : t.title}
            </h2>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
              {selected
                ? [selected.town, selected.state].filter(Boolean).join(", ")
                : t.centerCount(
                    formatNumber(visibleBranches.length),
                    [town, state].filter(Boolean).join(", ")
                  )}
              {overview &&
                ` · ${formatDay(overview.startDay, locale)}${overview.startDay < overview.endDay ? ` – ${formatDay(overview.endDay, locale)}` : ""}`}
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
              {t.viewPublicPage}
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
                <h3 className="text-lg font-medium">{t.noMatch}</h3>
                <p className="mt-1 max-w-2xl text-muted-foreground">
                  {t.noMatchBody}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium">{t.noData}</h3>
                <p className="mt-1 max-w-2xl text-muted-foreground">
                  {t.noDataBody(Boolean(selected))}
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
        {t.footnote}
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
  const t = useCopy(COPY)
  const labels = useCopy(LABELS)
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
    label: labels.contact[kind],
    short: kind === "call" ? t.call : labels.contact[kind],
    value: current[kind],
  }))
  const contactMax = Math.max(...contactKinds.map((kind) => kind.value))
  const length = rangeLength(range)
  const previousLabel = t.previous(length)
  const { impressions, clicks } = overview.featured
  const sourceMax = overview.sources[0]?.value ?? 0

  return (
    <>
      <section aria-label={t.summary}>
        <p className="mb-2 text-sm text-muted-foreground">
          {comparable.views
            ? t.comparedWith(previousLabel)
            : t.noComparison(previousLabel)}
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi
            label={t.pageViews}
            value={formatNumber(current.views)}
            delta={
              comparable.views && (
                <Delta current={current.views} previous={previous.views} />
              )
            }
          >
            {t.pageViewsHint}
          </Kpi>
          <Kpi
            label={t.visitors}
            value={formatNumber(current.visitors)}
            delta={
              comparable.views && (
                <Delta current={current.visitors} previous={previous.visitors} />
              )
            }
          >
            {t.visitorsHint}
          </Kpi>
          <Kpi
            label={t.contacts}
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
            label={t.contactRate}
            value={formatRate(rate)}
            delta={
              rateComparable &&
              previous.visitors > 0 && (
                <DeltaText
                  change={rateChange}
                  text={t.points(Math.abs(rateChange).toFixed(1))}
                />
              )
            }
          >
            {t.contactRateHint}
          </Kpi>
          <Kpi
            label={t.leads}
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
            {t.booked}
            {current.followUp > 0 && (
              <Link
                to="/dashboard"
                search={{ tab: "follow-up" }}
                className="mt-1 block text-xs underline underline-offset-2 hover:text-foreground"
              >
                {t.excludes(formatNumber(current.followUp))}{" "}
                <span className="whitespace-nowrap">{t.followUp}</span>
              </Link>
            )}
          </Kpi>
        </div>
      </section>

      <Card>
        <CardContent>
          <h3 className="mb-4 text-base font-medium">{t.dailyTrend}</h3>
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
            <h3 className="text-base font-medium">{t.contactMethods}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.selectToFilter}</p>
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
            <h3 className="text-base font-medium">{t.sources}</h3>
            {overview.sources.length === 0 ? (
              <p className="mt-4 text-muted-foreground">
                {t.noContacts}
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">{t.selectToFilter}</p>
                <ul className="mt-3 space-y-1">
                  {overview.sources.map((source) => (
                    <BarRow
                      key={`${source.key}|${source.sub}`}
                      label={labels.source[source.key]}
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
            <h3 className="text-base font-medium">{t.featured}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.featuredHint}
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-4">
              {[
                { label: t.impressions, value: formatNumber(impressions) },
                { label: t.clicks, value: formatNumber(clicks) },
                { label: t.clickRate, value: formatRate(impressions > 0 ? clicks / impressions : 0) },
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
  const t = useCopy(COPY)
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
        <h3 className="text-base font-medium">{t.comparedWithTown(data.town)}</h3>
        <p className="mt-1 text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {formatNumber(data.views)}
          </span>{" "}
          {t.townViews}{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatNumber(average)}
          </span>{" "}
          {t.across(formatNumber(data.centers))}
          {change !== null &&
            (change === 0 ? t.onPar : t.townDiff(Math.abs(change), change > 0))}
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
  const t = useCopy(COPY)
  if (change === 0) {
    return (
      <span className="text-xs text-muted-foreground">{t.noChange}</span>
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
      <span className="sr-only">{change > 0 ? t.up : t.down}</span> {text}
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
  const t = useCopy(COPY)
  return (
    <div className="space-y-4" aria-busy="true" aria-label={t.loading}>
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
