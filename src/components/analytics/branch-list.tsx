import { useMemo, useState } from "react"
import { ChevronRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { AnalyticsBranch } from "@/core/functions/analytics-functions"
import { defineCopy, useCopy } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { contactRate, formatNumber, formatRate } from "./format"

const SORTS = ["views", "contacts", "rate", "leads"] as const

type SortKey = (typeof SORTS)[number]

const INITIAL_LIMIT = 10
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_repeat(4,6.5rem)_1.25rem]"

function sortValue(branch: AnalyticsBranch, sort: SortKey) {
  if (sort === "rate") return contactRate(branch.contactVisitors, branch.visitors)
  return branch[sort]
}

const COPY = defineCopy({
  en: {
    sorts: {
      views: "Views",
      contacts: "Contacts",
      rate: "Contact rate",
      leads: "Leads",
    } satisfies Record<SortKey, string>,
    attention: {
      views: {
        label: "No views",
        hint: "Nobody opened this centre's page on dialisis.my in this period.",
      },
      contacts: {
        label: "No contacts",
        hint: "People viewed this centre, but nobody tapped Call, WhatsApp or Directions.",
      },
    },
    title: "Center performance",
    count: (shown: string, total: string) => `${shown} of ${total} centers`,
    description: "Contacts are taps on Call, WhatsApp or Directions from dialisis.my.",
    search: "Search centers",
    searchPlaceholder: "Search by name or town",
    sortBy: "Sort by",
    needsAttention: "Needs attention",
    center: "Center",
    rate: "Rate",
    empty: "No centers match your filters.",
    showTop: (limit: number) => `Show top ${limit} only`,
    showAll: (count: string) => `Show all ${count} centers`,
  },
  ms: {
    sorts: {
      views: "Paparan",
      contacts: "Hubungan",
      rate: "Kadar hubungan",
      leads: "Permohonan",
    },
    attention: {
      views: {
        label: "Tiada paparan",
        hint: "Tiada sesiapa membuka halaman pusat ini di dialisis.my dalam tempoh ini.",
      },
      contacts: {
        label: "Tiada hubungan",
        hint: "Ada yang melihat pusat ini, tetapi tiada sesiapa menekan Panggil, WhatsApp atau Arah.",
      },
    },
    title: "Prestasi pusat",
    count: (shown: string, total: string) => `${shown} daripada ${total} pusat`,
    description: "Hubungan dikira apabila pelawat menekan Panggil, WhatsApp atau Arah di dialisis.my.",
    search: "Cari pusat",
    searchPlaceholder: "Cari mengikut nama atau bandar",
    sortBy: "Susun mengikut",
    needsAttention: "Perlu perhatian",
    center: "Pusat",
    rate: "Kadar",
    empty: "Tiada pusat sepadan dengan tapisan anda.",
    showTop: (limit: number) => `Lihat ${limit} teratas sahaja`,
    showAll: (count: string) => `Lihat semua ${count} pusat`,
  },
})

function attentionKey(branch: AnalyticsBranch) {
  if (branch.views === 0) return "views"
  if (branch.contacts === 0) return "contacts"
  return null
}

export function BranchList({
  branches,
  onSelect,
}: {
  branches: AnalyticsBranch[]
  onSelect: (id: string) => void
}) {
  const t = useCopy(COPY)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("views")
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const attentionCount = branches.filter(attentionKey).length

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return branches
      .filter(
        (branch) =>
          (!needle ||
            branch.name.toLowerCase().includes(needle) ||
            branch.town.toLowerCase().includes(needle)) &&
          (!attentionOnly || attentionKey(branch))
      )
      .sort(
        (a, b) => sortValue(b, sort) - sortValue(a, sort) || b.views - a.views
      )
  }, [branches, query, sort, attentionOnly])

  const isFiltering = Boolean(query.trim() || attentionOnly)
  const visible =
    showAll || isFiltering ? filtered : filtered.slice(0, INITIAL_LIMIT)
  const max = Math.max(...filtered.map((branch) => sortValue(branch, sort)), 0)

  return (
    <Card className="gap-0 py-0" aria-labelledby="branch-list-heading" role="region">
      <div className="border-b p-4 md:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="branch-list-heading" className="text-base font-medium">
            {t.title}
          </h3>
          <p className="text-xs tabular-nums text-muted-foreground">
            {t.count(formatNumber(filtered.length), formatNumber(branches.length))}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.description}
        </p>

        <label className="relative mt-4 block">
          <span className="sr-only">{t.search}</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-10 pl-9"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted-foreground">{t.sortBy}</span>
          {SORTS.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={sort === option ? "secondary" : "ghost"}
              aria-pressed={sort === option}
              onClick={() => setSort(option)}
              className="h-9 px-3"
            >
              {t.sorts[option]}
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
              {t.needsAttention}
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
        <span>{t.center}</span>
        <span className="text-right">{t.sorts.views}</span>
        <span className="text-right">{t.sorts.contacts}</span>
        <span className="text-right">{t.sorts.rate}</span>
        <span className="text-right">{t.sorts.leads}</span>
      </div>

      {visible.length === 0 ? (
        <p className="p-6 text-center text-muted-foreground">
          {t.empty}
        </p>
      ) : (
        <ul className="divide-y">
          {visible.map((branch) => {
            const key = attentionKey(branch)
            const attention = key && t.attention[key]
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                              <span
                                aria-hidden="true"
                                className="size-1.5 rounded-full bg-destructive"
                              />
                              {attention.label}
                              <span className="sr-only">: {attention.hint}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{attention.hint}</TooltipContent>
                        </Tooltip>
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
                    <Stat label={t.sorts.views} value={formatNumber(branch.views)} active={sort === "views"} />
                    <Stat label={t.sorts.contacts} value={formatNumber(branch.contacts)} active={sort === "contacts"} />
                    <Stat
                      label={t.rate}
                      value={formatRate(contactRate(branch.contactVisitors, branch.visitors))}
                      active={sort === "rate"}
                    />
                    <Stat label={t.sorts.leads} value={formatNumber(branch.leads)} active={sort === "leads"} />
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
              ? t.showTop(INITIAL_LIMIT)
              : t.showAll(formatNumber(filtered.length))}
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
