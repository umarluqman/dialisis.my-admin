import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ANALYTICS_PRESETS,
  CONTACT_KINDS,
  isValidRange,
  SOURCE_KEYS,
  toMytDay,
  type AnalyticsPreset,
  type AnalyticsRange,
  type ContactKind,
  type SourceKey,
} from "@/lib/analytics"
import { defineCopy, useCopy } from "@/lib/i18n"
import { LABELS } from "./format"

const ALL = "all"

const COPY = defineCopy({
  en: {
    period: "Reporting period",
    days: (days: number) => `${days} days`,
    fromDate: "From date",
    toDate: "To date",
    state: "State",
    allStates: "All states",
    town: "Town",
    allTowns: "All towns",
    contactType: "Contact type",
    allContactTypes: "All contact types",
    sourcePage: "Source page",
    allSourcePages: "All source pages",
    reset: "Reset",
  },
  ms: {
    period: "Tempoh laporan",
    days: (days: number) => `${days} hari`,
    fromDate: "Tarikh mula",
    toDate: "Tarikh akhir",
    state: "Negeri",
    allStates: "Semua negeri",
    town: "Bandar",
    allTowns: "Semua bandar",
    contactType: "Jenis hubungan",
    allContactTypes: "Semua jenis hubungan",
    sourcePage: "Halaman sumber",
    allSourcePages: "Semua halaman sumber",
    reset: "Set semula",
  },
})

export type AnalyticsSearch = {
  days?: AnalyticsPreset
  from?: string
  to?: string
  state?: string
  town?: string
  contact?: ContactKind
  source?: SourceKey
}

export function AnalyticsFilters({
  search,
  range,
  activePreset,
  minDay,
  states,
  towns,
  onChange,
}: {
  search: AnalyticsSearch
  range: AnalyticsRange
  activePreset: AnalyticsPreset | null
  minDay?: string
  states: string[]
  towns: string[]
  onChange: (patch: AnalyticsSearch) => void
}) {
  const t = useCopy(COPY)
  const labels = useCopy(LABELS)
  const today = toMytDay(Date.now())
  const setRange = (next: AnalyticsRange) => {
    if (isValidRange(next)) onChange({ ...next, days: undefined })
  }
  const isFiltered = Object.values(search).some((value) => value !== undefined)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label={t.period}
        className="flex gap-1 rounded-lg border bg-card p-1"
      >
        {ANALYTICS_PRESETS.map((days) => (
          <Button
            key={days}
            size="sm"
            variant={days === activePreset ? "secondary" : "ghost"}
            aria-pressed={days === activePreset}
            onClick={() => onChange({ days, from: undefined, to: undefined })}
          >
            {t.days(days)}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          aria-label={t.fromDate}
          value={range.from}
          min={minDay}
          max={range.to}
          onChange={(event) => setRange({ from: event.target.value, to: range.to })}
          className="h-9 w-auto"
        />
        <span aria-hidden="true" className="text-muted-foreground">
          –
        </span>
        <Input
          type="date"
          aria-label={t.toDate}
          value={range.to}
          min={range.from}
          max={today}
          onChange={(event) => setRange({ from: range.from, to: event.target.value })}
          className="h-9 w-auto"
        />
      </div>

      {states.length > 1 && (
        <FilterSelect
          label={t.state}
          allLabel={t.allStates}
          value={search.state}
          options={states.map((name) => [name, name])}
          onChange={(state) => onChange({ state, town: undefined })}
        />
      )}
      {towns.length > 1 && (
        <FilterSelect
          label={t.town}
          allLabel={t.allTowns}
          value={search.town}
          options={towns.map((name) => [name, name])}
          onChange={(town) => onChange({ town })}
        />
      )}
      <FilterSelect
        label={t.contactType}
        allLabel={t.allContactTypes}
        value={search.contact}
        options={CONTACT_KINDS.map((kind) => [kind, labels.contact[kind]])}
        onChange={(contact) => onChange({ contact: contact as ContactKind | undefined })}
      />
      <FilterSelect
        label={t.sourcePage}
        allLabel={t.allSourcePages}
        value={search.source}
        options={SOURCE_KEYS.map((key) => [key, labels.source[key]])}
        onChange={(source) => onChange({ source: source as SourceKey | undefined })}
      />

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() =>
            onChange({
              days: undefined,
              from: undefined,
              to: undefined,
              state: undefined,
              town: undefined,
              contact: undefined,
              source: undefined,
            })
          }
        >
          <X />
          {t.reset}
        </Button>
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
  value?: string
  options: [string, string][]
  onChange: (value: string | undefined) => void
}) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next) => onChange(next === ALL ? undefined : next)}
    >
      <SelectTrigger aria-label={label} className="h-9! max-w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map(([optionValue, optionLabel]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
