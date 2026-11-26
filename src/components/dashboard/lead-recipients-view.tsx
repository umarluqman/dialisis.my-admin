import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  Layers,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  LEAD_STATUS_COPY,
  formatAge,
  formatDate,
} from "@/components/intake-lead-list"
import {
  buildLeadRecipientsReport,
  type BrandLeadSummary,
  type CenterLeadSummary,
  type LeadRecipientLead,
} from "@/lib/lead-recipients"
import { defineCopy, useCopy, useLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { leadRecipientsQuery } from "./queries"

type GroupBy = "brand" | "center"
type CoverageFilter = "received" | "none" | "all"
type ClaimFilter = "all" | "claimed" | "unclaimed"
type SortKey = "leads" | "recent" | "name"

const PAGE_SIZE = 50
const BRAND_COLS =
  "md:grid-cols-[minmax(0,1.8fr)_6.5rem_4.5rem_4.5rem_4.5rem_5.5rem]"
const CENTER_COLS =
  "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_4.5rem_4.5rem_4.5rem_5.5rem]"

const COPY = defineCopy({
  en: {
    kpiCenters: "Centers with leads",
    kpiCentersSub: (total: number) => `of ${total} centers`,
    kpiBrands: "Brands with leads",
    kpiBrandsSub: (total: number) => `of ${total} brands`,
    kpiLeads: "Unique leads",
    kpiLeadsSub: (viewed: number, booked: number) =>
      `${viewed} viewed · ${booked} booked`,
    kpiUnclaimed: "Unclaimed with leads",
    kpiUnclaimedSub: (claimed: number) => `${claimed} claimed with leads`,
    viewModeLabel: "Group by",
    byBrand: "By brand",
    byCenter: "By center",
    searchLabel: "Search brand or center",
    searchPlaceholder: "Search brand, center, town or state",
    coverageLabel: "Filter by lead status",
    coverage: {
      received: "Received leads",
      none: "No leads yet",
      all: "All",
    } satisfies Record<CoverageFilter, string>,
    claimLabel: "Claim status",
    claim: {
      all: "All claim statuses",
      claimed: "Claimed",
      unclaimed: "Unclaimed",
    } satisfies Record<ClaimFilter, string>,
    sortLabel: "Sort by",
    sorts: {
      leads: "Most leads",
      recent: "Latest lead",
      name: "Name A–Z",
    } satisfies Record<SortKey, string>,
    includePreFix: (count: number) => `Include pre-fix (${count})`,
    includePreFixTitle:
      "Include leads submitted before the 24 Sep 2026 email delivery fix",
    independentOnly: "Independent only",
    clear: "Clear",
    loadFailed: "Failed to load lead recipients.",
    emptyBrands: "No brands match these filters.",
    emptyCenters: "No centers match these filters.",
    colBrand: "Brand",
    colCenter: "Center",
    colBranches: "Branches",
    colLeads: "Leads",
    colViewed: "Viewed",
    colBooked: "Booked",
    colLastLead: "Last lead",
    claimed: "Claimed",
    unclaimed: "Unclaimed",
    claimedRatio: (claimed: number, total: number) =>
      `${claimed}/${total} claimed`,
    noLeadsYet: "No leads yet",
    independent: "Independent",
    unnamed: "Unnamed center",
    brandPage: "Brand page",
    centerPage: "Center page",
    editCenter: "Edit center",
    viewLead: "View lead",
    opened: "Viewed",
    emailSent: "Email sent",
    notSent: "Not sent",
    beforeFix: "Before fix",
    submissions: (n: number) => `${n}×`,
    showAllBranches: (total: number) => `Show all ${total} branches`,
    showLeadBranchesOnly: (count: number) =>
      `Show only ${count} with leads`,
    noLeadsForCenter: "No leads received by this center yet.",
    independentCallout: (n: number) =>
      `${n} independent ${n === 1 ? "center" : "centers"} without a brand also received leads.`,
    viewIndependent: "View independent centers",
    showing: (visible: number, total: number) =>
      `Showing ${visible} of ${total}`,
    showMore: "Show more",
  },
  ms: {
    kpiCenters: "Pusat terima permohonan",
    kpiCentersSub: (total: number) => `daripada ${total} pusat`,
    kpiBrands: "Jenama terima permohonan",
    kpiBrandsSub: (total: number) => `daripada ${total} jenama`,
    kpiLeads: "Permohonan unik",
    kpiLeadsSub: (viewed: number, booked: number) =>
      `${viewed} dilihat · ${booked} ditempah`,
    kpiUnclaimed: "Belum dituntut (ada lead)",
    kpiUnclaimedSub: (claimed: number) => `${claimed} telah dituntut`,
    viewModeLabel: "Kumpul mengikut",
    byBrand: "Mengikut jenama",
    byCenter: "Mengikut pusat",
    searchLabel: "Cari jenama atau pusat",
    searchPlaceholder: "Cari jenama, pusat, bandar atau negeri",
    coverageLabel: "Tapis mengikut status permohonan",
    coverage: {
      received: "Sudah terima",
      none: "Belum terima",
      all: "Semua",
    },
    claimLabel: "Status tuntutan",
    claim: {
      all: "Semua status tuntutan",
      claimed: "Dituntut",
      unclaimed: "Belum dituntut",
    },
    sortLabel: "Susun mengikut",
    sorts: {
      leads: "Paling banyak",
      recent: "Terkini",
      name: "Nama A–Z",
    },
    includePreFix: (count: number) => `Termasuk sebelum pembetulan (${count})`,
    includePreFixTitle:
      "Sertakan permohonan sebelum pembetulan penghantaran e-mel pada 24 Sep 2026",
    independentOnly: "Pusat bebas sahaja",
    clear: "Kosongkan",
    loadFailed: "Gagal memuatkan penerima permohonan.",
    emptyBrands: "Tiada jenama sepadan dengan tapisan ini.",
    emptyCenters: "Tiada pusat sepadan dengan tapisan ini.",
    colBrand: "Jenama",
    colCenter: "Pusat",
    colBranches: "Cawangan",
    colLeads: "Permohonan",
    colViewed: "Dilihat",
    colBooked: "Ditempah",
    colLastLead: "Terkini",
    claimed: "Dituntut",
    unclaimed: "Belum dituntut",
    claimedRatio: (claimed: number, total: number) =>
      `${claimed}/${total} dituntut`,
    noLeadsYet: "Belum terima",
    independent: "Pusat bebas",
    unnamed: "Pusat tanpa nama",
    brandPage: "Halaman jenama",
    centerPage: "Halaman pusat",
    editCenter: "Sunting pusat",
    viewLead: "Lihat permohonan",
    opened: "Dilihat",
    emailSent: "E-mel dihantar",
    notSent: "Tidak dihantar",
    beforeFix: "Sebelum pembetulan",
    submissions: (n: number) => `${n}×`,
    showAllBranches: (total: number) => `Lihat semua ${total} cawangan`,
    showLeadBranchesOnly: (count: number) =>
      `Lihat ${count} cawangan berpermohonan sahaja`,
    noLeadsForCenter: "Belum ada permohonan diterima oleh pusat ini.",
    independentCallout: (n: number) =>
      `${n} pusat bebas (tanpa jenama) turut menerima permohonan.`,
    viewIndependent: "Lihat pusat bebas",
    showing: (visible: number, total: number) =>
      `Memaparkan ${visible} daripada ${total}`,
    showMore: "Lihat lagi",
  },
})

function compareBySort(
  a: { leadsCount: number; lastLeadAt: string | null; name: string },
  b: { leadsCount: number; lastLeadAt: string | null; name: string },
  sort: SortKey
) {
  const aTime = a.lastLeadAt ? Date.parse(a.lastLeadAt) : 0
  const bTime = b.lastLeadAt ? Date.parse(b.lastLeadAt) : 0
  if (sort === "name") return a.name.localeCompare(b.name)
  if (sort === "recent") {
    return bTime - aTime || b.leadsCount - a.leadsCount || a.name.localeCompare(b.name)
  }
  return b.leadsCount - a.leadsCount || bTime - aTime || a.name.localeCompare(b.name)
}

function matchesCoverage(leadsCount: number, coverage: CoverageFilter) {
  if (coverage === "received") return leadsCount > 0
  if (coverage === "none") return leadsCount === 0
  return true
}

export function LeadRecipientsView() {
  const t = useCopy(COPY)
  const { data, isLoading, error } = useQuery(leadRecipientsQuery)
  const [groupBy, setGroupBy] = useState<GroupBy>("brand")
  const [coverage, setCoverage] = useState<CoverageFilter>("received")
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("all")
  const [sortBy, setSortBy] = useState<SortKey>("leads")
  const [query, setQuery] = useState("")
  const [includePreFix, setIncludePreFix] = useState(false)
  const [independentOnly, setIndependentOnly] = useState(false)

  const report = useMemo(() => {
    if (!data) return null
    return buildLeadRecipientsReport({
      centers: data.centers,
      companies: data.companies,
      leads: data.leads,
      includePreFix,
    })
  }, [data, includePreFix])

  const needle = query.trim().toLowerCase()

  const filteredBrands = useMemo(() => {
    if (!report) return []
    return report.brands
      .filter((brand) => {
        if (!matchesCoverage(brand.leadsCount, coverage)) return false
        if (claimFilter === "claimed" && brand.claimedBranches === 0) return false
        if (claimFilter === "unclaimed" && brand.claimedBranches > 0) return false
        if (!needle) return true
        if (brand.name.toLowerCase().includes(needle)) return true
        return brand.branches.some((branch) =>
          [branch.name, branch.town, branch.stateName].some((v) =>
            (v ?? "").toLowerCase().includes(needle)
          )
        )
      })
      .sort((a, b) => compareBySort(a, b, sortBy))
  }, [report, coverage, claimFilter, needle, sortBy])

  const filteredCenters = useMemo(() => {
    if (!report) return []
    return report.centers
      .filter((center) => {
        if (!matchesCoverage(center.leadsCount, coverage)) return false
        if (claimFilter === "claimed" && !center.claimed) return false
        if (claimFilter === "unclaimed" && center.claimed) return false
        if (independentOnly && center.companyId !== null) return false
        if (!needle) return true
        return [
          center.name,
          center.companyName,
          center.town,
          center.stateName,
        ].some((v) => (v ?? "").toLowerCase().includes(needle))
      })
      .sort((a, b) => compareBySort(a, b, sortBy))
  }, [report, coverage, claimFilter, independentOnly, needle, sortBy])

  if (error) {
    return (
      <p className="rounded-lg border p-8 text-center text-destructive">
        {error.message || t.loadFailed}
      </p>
    )
  }

  if (isLoading || !report) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} size="sm">
              <CardContent>
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-7 w-12 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="divide-y rounded-lg border bg-card">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const { summary } = report
  const brandCoverageCounts: Record<CoverageFilter, number> = {
    received: summary.brandsWithLeads,
    none: summary.totalBrands - summary.brandsWithLeads,
    all: summary.totalBrands,
  }
  const centerCoverageCounts: Record<CoverageFilter, number> = {
    received: summary.centersWithLeads,
    none: summary.totalCenters - summary.centersWithLeads,
    all: summary.totalCenters,
  }
  const coverageCounts =
    groupBy === "brand" ? brandCoverageCounts : centerCoverageCounts
  const listKey = [
    groupBy,
    coverage,
    claimFilter,
    sortBy,
    needle,
    includePreFix,
    independentOnly,
  ].join("|")

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card size="sm">
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground">
              {t.kpiCenters}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums">
              {summary.centersWithLeads}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t.kpiCentersSub(summary.totalCenters)}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground">
              {t.kpiBrands}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums">
              {summary.brandsWithLeads}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t.kpiBrandsSub(summary.totalBrands)}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground">
              {t.kpiLeads}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums">
              {summary.totalLeads}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t.kpiLeadsSub(summary.viewedLeads, summary.bookedLeads)}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground">
              {t.kpiUnclaimed}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums">
              {summary.unclaimedCentersWithLeads}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t.kpiUnclaimedSub(summary.claimedCentersWithLeads)}
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div
          role="group"
          aria-label={t.viewModeLabel}
          className="inline-flex shrink-0 rounded-lg border bg-muted/40 p-0.5"
        >
          <Button
            type="button"
            size="sm"
            variant={groupBy === "brand" ? "default" : "ghost"}
            aria-pressed={groupBy === "brand"}
            className="h-8"
            onClick={() => {
              setGroupBy("brand")
              setIndependentOnly(false)
            }}
          >
            <Layers className="size-3.5" />
            {t.byBrand}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={groupBy === "center" ? "default" : "ghost"}
            aria-pressed={groupBy === "center"}
            className="h-8"
            onClick={() => setGroupBy("center")}
          >
            <Building2 className="size-3.5" />
            {t.byCenter}
          </Button>
        </div>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t.searchLabel}
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={claimFilter}
            onValueChange={(v) => setClaimFilter(v as ClaimFilter)}
          >
            <SelectTrigger aria-label={t.claimLabel} className="data-[size=default]:h-9 min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["all", "claimed", "unclaimed"] as const).map((option) => (
                <SelectItem key={option} value={option}>
                  {t.claim[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortKey)}
          >
            <SelectTrigger aria-label={t.sortLabel} className="data-[size=default]:h-9 min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["leads", "recent", "name"] as const).map((option) => (
                <SelectItem key={option} value={option}>
                  {t.sorts[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label={t.coverageLabel}
          className="flex flex-wrap items-center gap-2"
        >
          {(["received", "none", "all"] as const).map((option) => {
            const active = coverage === option
            return (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                className="rounded-full"
                onClick={() => setCoverage(option)}
              >
                {t.coverage[option]}
                <span className="tabular-nums opacity-70">
                  {coverageCounts[option]}
                </span>
              </Button>
            )
          })}
          {groupBy === "center" && independentOnly && (
            <Badge variant="secondary" className="gap-1.5 py-1">
              {t.independentOnly}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setIndependentOnly(false)}
              >
                {t.clear}
              </button>
            </Badge>
          )}
        </div>

        {summary.preFixLeadCount > 0 && (
          <div
            className="flex items-center gap-2"
            title={t.includePreFixTitle}
          >
            <Switch
              id="include-prefix-leads"
              checked={includePreFix}
              onCheckedChange={setIncludePreFix}
            />
            <Label
              htmlFor="include-prefix-leads"
              className="cursor-pointer text-xs font-normal text-muted-foreground"
            >
              {t.includePreFix(summary.preFixLeadCount)}
            </Label>
          </div>
        )}
      </div>

      {groupBy === "brand" ? (
        <>
          <BrandRecipientList
            key={listKey}
            brands={filteredBrands}
            emptyMessage={t.emptyBrands}
            defaultLeadBranchesOnly={coverage === "received"}
          />
          {summary.independentCentersWithLeads > 0 && coverage !== "none" && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                {t.independentCallout(summary.independentCentersWithLeads)}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setGroupBy("center")
                  setIndependentOnly(true)
                  setCoverage("received")
                }}
              >
                {t.viewIndependent}
              </Button>
            </div>
          )}
        </>
      ) : (
        <CenterRecipientList
          key={listKey}
          centers={filteredCenters}
          emptyMessage={t.emptyCenters}
        />
      )}
    </div>
  )
}

function BrandRecipientList({
  brands,
  emptyMessage,
  defaultLeadBranchesOnly,
}: {
  brands: BrandLeadSummary[]
  emptyMessage: string
  defaultLeadBranchesOnly: boolean
}) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const t = useCopy(COPY)

  if (brands.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-card">
        <div
          aria-hidden
          className="hidden items-center gap-3 border-b bg-muted/40 py-2 pr-4 pl-11 text-xs font-medium text-muted-foreground md:flex"
        >
          <div className={cn("grid flex-1 gap-4", BRAND_COLS)}>
            <span>{t.colBrand}</span>
            <span className="text-right">{t.colBranches}</span>
            <span className="text-right">{t.colLeads}</span>
            <span className="text-right">{t.colViewed}</span>
            <span className="text-right">{t.colBooked}</span>
            <span className="text-right">{t.colLastLead}</span>
          </div>
        </div>
        <ul className="divide-y">
          {brands.slice(0, visible).map((brand) => (
            <BrandRow
              key={brand.id}
              brand={brand}
              defaultLeadBranchesOnly={defaultLeadBranchesOnly}
            />
          ))}
        </ul>
      </div>
      {visible < brands.length && (
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {t.showing(visible, brands.length)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
          >
            {t.showMore}
          </Button>
        </div>
      )}
    </div>
  )
}

function BrandRow({
  brand,
  defaultLeadBranchesOnly,
}: {
  brand: BrandLeadSummary
  defaultLeadBranchesOnly: boolean
}) {
  const t = useCopy(COPY)
  const { locale } = useLocale()
  const [showAllBranches, setShowAllBranches] = useState(
    !defaultLeadBranchesOnly || brand.branchesWithLeads === 0
  )

  const branchesToShow = showAllBranches
    ? brand.branches
    : brand.branches.filter((b) => b.leadsCount > 0)
  const hasHiddenBranches =
    brand.branchesWithLeads > 0 && brand.branchesWithLeads < brand.totalBranches

  return (
    <Collapsible asChild>
      <li className="group/brand">
        <CollapsibleTrigger className="flex w-full items-center gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:px-4">
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/brand:rotate-180" />
          <div className={cn("min-w-0 flex-1 md:grid md:items-center md:gap-4", BRAND_COLS)}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-medium">{brand.name}</span>
                {brand.leadsCount === 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t.noLeadsYet}
                  </Badge>
                )}
                {brand.claimedBranches > 0 ? (
                  <Badge variant="secondary">
                    {t.claimedRatio(brand.claimedBranches, brand.totalBranches)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t.unclaimed}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums md:hidden">
                {brand.branchesWithLeads}/{brand.totalBranches} {t.colBranches.toLowerCase()} ·{" "}
                {brand.leadsCount} {t.colLeads.toLowerCase()} ·{" "}
                {brand.viewedCount} {t.colViewed.toLowerCase()} ·{" "}
                {brand.bookedCount} {t.colBooked.toLowerCase()}
                {brand.lastLeadAt ? ` · ${formatAge(brand.lastLeadAt, locale)}` : ""}
              </p>
            </div>
            <span className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">
              {brand.branchesWithLeads} / {brand.totalBranches}
            </span>
            <span className="hidden text-right text-sm font-semibold tabular-nums md:block">
              {brand.leadsCount}
            </span>
            <span className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">
              {brand.viewedCount}
            </span>
            <span className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">
              {brand.bookedCount}
            </span>
            <span className="hidden text-right text-xs whitespace-nowrap tabular-nums text-muted-foreground md:block">
              {brand.lastLeadAt ? formatAge(brand.lastLeadAt, locale) : "—"}
            </span>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="border-t bg-muted/30 px-4 py-3 md:pl-11">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            {hasHiddenBranches && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAllBranches((v) => !v)}
              >
                {showAllBranches
                  ? t.showLeadBranchesOnly(brand.branchesWithLeads)
                  : t.showAllBranches(brand.totalBranches)}
              </Button>
            )}
            {brand.slug && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="ml-auto"
              >
                <a
                  href={`https://www.dialisis.my/rangkaian/${brand.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.brandPage}
                  <ExternalLink />
                </a>
              </Button>
            )}
          </div>

          <ul className="divide-y overflow-hidden rounded-md border bg-background">
            {branchesToShow.map((branch) => (
              <li key={branch.id} className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        to="/centers/$centerId"
                        params={{ centerId: branch.id }}
                        className="text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {branch.name || t.unnamed}
                      </Link>
                      <Badge
                        variant={branch.claimed ? "secondary" : "outline"}
                        className={cn(!branch.claimed && "text-muted-foreground")}
                      >
                        {branch.claimed ? t.claimed : t.unclaimed}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[branch.town, branch.stateName].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {branch.leadsCount} {t.colLeads.toLowerCase()}
                    </span>
                    <span>
                      {branch.viewedCount} {t.colViewed.toLowerCase()}
                    </span>
                    <span>
                      {branch.bookedCount} {t.colBooked.toLowerCase()}
                    </span>
                    {branch.lastLeadAt && (
                      <span>{formatAge(branch.lastLeadAt, locale)}</span>
                    )}
                  </div>
                </div>
                {branch.leads.length > 0 && (
                  <LeadMiniList leads={branch.leads} className="mt-2" />
                )}
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </li>
    </Collapsible>
  )
}

function CenterRecipientList({
  centers,
  emptyMessage,
}: {
  centers: CenterLeadSummary[]
  emptyMessage: string
}) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const t = useCopy(COPY)

  if (centers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-card">
        <div
          aria-hidden
          className="hidden items-center gap-3 border-b bg-muted/40 py-2 pr-4 pl-11 text-xs font-medium text-muted-foreground md:flex"
        >
          <div className={cn("grid flex-1 gap-4", CENTER_COLS)}>
            <span>{t.colCenter}</span>
            <span>{t.colBrand}</span>
            <span className="text-right">{t.colLeads}</span>
            <span className="text-right">{t.colViewed}</span>
            <span className="text-right">{t.colBooked}</span>
            <span className="text-right">{t.colLastLead}</span>
          </div>
        </div>
        <ul className="divide-y">
          {centers.slice(0, visible).map((center) => (
            <CenterRow key={center.id} center={center} />
          ))}
        </ul>
      </div>
      {visible < centers.length && (
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {t.showing(visible, centers.length)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
          >
            {t.showMore}
          </Button>
        </div>
      )}
    </div>
  )
}

function CenterRow({ center }: { center: CenterLeadSummary }) {
  const t = useCopy(COPY)
  const { locale } = useLocale()
  const location = [center.town, center.stateName].filter(Boolean).join(" · ")

  return (
    <Collapsible asChild>
      <li className="group/center">
        <CollapsibleTrigger className="flex w-full items-center gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:px-4">
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/center:rotate-180" />
          <div className={cn("min-w-0 flex-1 md:grid md:items-center md:gap-4", CENTER_COLS)}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-medium">
                  {center.name || t.unnamed}
                </span>
                {center.leadsCount === 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t.noLeadsYet}
                  </Badge>
                )}
                <Badge
                  variant={center.claimed ? "secondary" : "outline"}
                  className={cn(!center.claimed && "text-muted-foreground")}
                >
                  {center.claimed ? t.claimed : t.unclaimed}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {location || "—"}
                <span className="md:hidden">
                  {" · "}
                  {center.companyName ?? t.independent}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums md:hidden">
                {center.leadsCount} {t.colLeads.toLowerCase()} ·{" "}
                {center.viewedCount} {t.colViewed.toLowerCase()} ·{" "}
                {center.bookedCount} {t.colBooked.toLowerCase()}
                {center.lastLeadAt ? ` · ${formatAge(center.lastLeadAt, locale)}` : ""}
              </p>
            </div>
            <span className="hidden truncate text-sm text-muted-foreground md:block">
              {center.companyName ?? t.independent}
            </span>
            <span className="hidden text-right text-sm font-semibold tabular-nums md:block">
              {center.leadsCount}
            </span>
            <span className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">
              {center.viewedCount}
            </span>
            <span className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">
              {center.bookedCount}
            </span>
            <span className="hidden text-right text-xs whitespace-nowrap tabular-nums text-muted-foreground md:block">
              {center.lastLeadAt ? formatAge(center.lastLeadAt, locale) : "—"}
            </span>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="border-t bg-muted/30 px-4 py-3 md:pl-11">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/centers/$centerId" params={{ centerId: center.id }}>
                {t.editCenter}
              </Link>
            </Button>
            {center.slug && (
              <Button asChild size="sm" variant="outline">
                <a
                  href={`https://www.dialisis.my/${center.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.centerPage}
                  <ExternalLink />
                </a>
              </Button>
            )}
          </div>

          {center.leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noLeadsForCenter}</p>
          ) : (
            <LeadMiniList leads={center.leads} />
          )}
        </CollapsibleContent>
      </li>
    </Collapsible>
  )
}

function LeadMiniList({
  leads,
  className,
}: {
  leads: LeadRecipientLead[]
  className?: string
}) {
  const t = useCopy(COPY)
  const statusLabels = useCopy(LEAD_STATUS_COPY)
  const { locale } = useLocale()

  return (
    <ul className={cn("divide-y rounded-md border bg-card/70 text-xs", className)}>
      {leads.map((lead) => (
        <li
          key={lead.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
        >
          <Link
            to="/leads/$leadId"
            params={{ leadId: lead.id }}
            className="font-medium underline-offset-4 hover:underline"
          >
            {lead.fullName}
          </Link>
          <span className="text-muted-foreground tabular-nums">
            {formatDate(lead.createdAt, locale)}
          </span>
          <Badge
            variant={
              lead.status === "new"
                ? "default"
                : lead.status === "contacted"
                  ? "secondary"
                  : "outline"
            }
            className={cn(
              "h-5 text-[11px]",
              lead.status === "rejected" && "text-muted-foreground"
            )}
          >
            {lead.status === "booked" && <Check className="size-3" />}
            {statusLabels[lead.status]}
          </Badge>
          {lead.viewedAt ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Eye className="size-3" />
              {t.opened}
            </span>
          ) : lead.delivered ? (
            <span className="text-muted-foreground">{t.emailSent}</span>
          ) : (
            <span className="text-destructive">{t.notSent}</span>
          )}
          {lead.submissions > 1 && (
            <Badge variant="outline" className="h-5 text-[11px] text-muted-foreground">
              {t.submissions(lead.submissions)}
            </Badge>
          )}
          {lead.preFix && (
            <Badge variant="outline" className="h-5 text-[11px] text-muted-foreground">
              {t.beforeFix}
            </Badge>
          )}
          <Link
            to="/leads/$leadId"
            params={{ leadId: lead.id }}
            className="ml-auto text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t.viewLead}
          </Link>
        </li>
      ))}
    </ul>
  )
}
