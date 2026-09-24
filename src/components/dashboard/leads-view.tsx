import { useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  IntakeLeadList,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  toLeadStatus,
  type LeadStatus,
} from "@/components/intake-lead-list"
import { LEAD_LIMIT, intakeLeadsQuery } from "./queries"

export function LeadsView() {
  const search = useSearch({ from: "/dashboard" })
  const navigate = useNavigate({ from: "/dashboard" })
  const { data: leads = [], isLoading, error } = useQuery(intakeLeadsQuery)

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const query = (search.q ?? "").trim().toLowerCase()
  const matching = leads.filter(
    (lead) =>
      !query ||
      [lead.fullName, lead.centerName, lead.phoneNumber, lead.myKadNumber].some((v) =>
        (v ?? "").toLowerCase().includes(query)
      )
  )
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>
  for (const lead of matching) counts[toLeadStatus(lead.status)]++
  const filtered = search.status
    ? matching.filter((lead) => toLeadStatus(lead.status) === search.status)
    : matching

  const chips: { value: LeadStatus | undefined; label: string; count: number }[] = [
    { value: undefined, label: "All", count: matching.length },
    ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s], count: counts[s] })),
  ]

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search leads"
          placeholder="Search patient, center, phone or MyKad"
          value={search.q ?? ""}
          onChange={(e) => setSearch({ q: e.target.value || undefined })}
          className="h-9 pl-9"
        />
      </div>

      <div role="group" aria-label="Filter by status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {chips.map((chip) => {
          const active = search.status === chip.value
          return (
            <Button
              key={chip.label}
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              className="shrink-0 rounded-full"
              onClick={() => setSearch({ status: chip.value })}
            >
              {chip.label}
              <span className="tabular-nums opacity-70">{chip.count}</span>
            </Button>
          )
        })}
      </div>

      {error ? (
        <p className="rounded-lg border p-8 text-center text-destructive">
          {error.message || "Failed to load intake leads."}
        </p>
      ) : isLoading ? (
        <div className="divide-y rounded-lg border bg-card">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <IntakeLeadList
            key={`${query}|${search.status}`}
            leads={filtered}
            emptyMessage={
              query || search.status ? "No intake leads match these filters." : "No intake leads yet."
            }
          />
          {leads.length >= LEAD_LIMIT && (
            <p className="text-center text-xs text-muted-foreground">
              Only the latest {LEAD_LIMIT} leads are loaded.
            </p>
          )}
        </>
      )}
    </div>
  )
}
