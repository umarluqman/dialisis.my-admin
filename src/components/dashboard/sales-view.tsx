import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  saveSalesProspect,
  type SalesProspectRow,
} from "@/core/functions/sales-functions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toMytDay } from "@/lib/analytics"
import { SALES_STAGES, weeklyScorecard } from "@/lib/sales"
import { cn } from "@/lib/utils"
import { allCentersQuery, salesProspectsQuery } from "./queries"

type Stage = (typeof SALES_STAGES)[number]

const STAGE_LABELS: Record<Stage, string> = {
  contacted: "Contacted",
  demo: "Demo",
  pilot: "Pilot",
  paid: "Paid",
  lost: "Lost",
}

type ProspectInput = Parameters<typeof saveSalesProspect>[0]["data"]

function useSaveProspect(onSaved?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ProspectInput) => saveSalesProspect({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesProspects"] })
      onSaved?.()
    },
    onError: (error) => toast.error(error.message || "Failed to save prospect"),
  })
}

function toInput(prospect: SalesProspectRow): ProspectInput {
  return {
    id: prospect.id,
    organization: prospect.organization,
    dialysisCenterId: prospect.dialysisCenterId,
    contactName: prospect.contactName,
    phone: prospect.phone,
    stage: prospect.stage,
    lostReason: prospect.lostReason,
    notes: prospect.notes,
    nextFollowUpAt: prospect.nextFollowUpAt,
  }
}

export function SalesView() {
  const { data: prospects = [], isLoading, error } = useQuery(salesProspectsQuery)
  const [stage, setStage] = useState<Stage | undefined>()
  const [editing, setEditing] = useState<SalesProspectRow | "new" | null>(null)

  const scorecard = weeklyScorecard(prospects)
  const filtered = stage ? prospects.filter((p) => p.stage === stage) : prospects
  const chips = [
    { value: undefined, label: "All", count: prospects.length },
    ...SALES_STAGES.map((s) => ({
      value: s,
      label: STAGE_LABELS[s],
      count: prospects.filter((p) => p.stage === s).length,
    })),
  ]

  return (
    <div className="space-y-4">
      <section aria-label="This week" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {scorecard.map((row) => (
          <Card key={row.stage} size="sm">
            <CardContent>
              <p className="text-sm font-medium text-muted-foreground">
                {STAGE_LABELS[row.stage]} this week
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">{row.thisWeek}</p>
              <p className="text-sm text-muted-foreground tabular-nums">Last week {row.lastWeek}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter by stage" className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {chips.map((chip) => (
            <Button
              key={chip.label}
              size="sm"
              variant={stage === chip.value ? "default" : "outline"}
              aria-pressed={stage === chip.value}
              className="shrink-0 rounded-full"
              onClick={() => setStage(chip.value)}
            >
              {chip.label}
              <span className="tabular-nums opacity-70">{chip.count}</span>
            </Button>
          ))}
        </div>
        <Button className="h-9" onClick={() => setEditing("new")}>
          <Plus />
          Add prospect
        </Button>
      </div>

      {editing && (
        <ProspectForm
          key={editing === "new" ? "new" : editing.id}
          prospect={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
        />
      )}

      {error ? (
        <p className="rounded-lg border p-8 text-center text-destructive">
          {error.message || "Failed to load prospects."}
        </p>
      ) : isLoading ? (
        <p className="rounded-lg border p-8 text-center text-muted-foreground">Loading prospects...</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {stage ? "No prospects in this stage." : "No prospects yet."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {filtered.map((prospect) => (
            <ProspectRow key={prospect.id} prospect={prospect} onEdit={() => setEditing(prospect)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ProspectRow({
  prospect,
  onEdit,
}: {
  prospect: SalesProspectRow
  onEdit: () => void
}) {
  const saveMutation = useSaveProspect()
  const followUp = prospect.nextFollowUpAt
  const overdue =
    followUp && !["paid", "lost"].includes(prospect.stage) && followUp.getTime() < Date.now()

  return (
    <li className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4 md:px-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{prospect.organization}</p>
        <p className="truncate text-sm text-muted-foreground">
          {[prospect.contactName, prospect.phone, prospect.centerName].filter(Boolean).join(" · ") || "-"}
        </p>
        {(prospect.stage === "lost" && prospect.lostReason) || prospect.notes ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {prospect.stage === "lost" && prospect.lostReason
              ? `Lost: ${prospect.lostReason}`
              : prospect.notes}
          </p>
        ) : null}
      </div>
      {followUp && (
        <span className={cn("text-sm tabular-nums", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
          Follow up {toMytDay(followUp.getTime())}
        </span>
      )}
      <div className="flex items-center gap-2">
        <Select
          value={prospect.stage}
          disabled={saveMutation.isPending}
          onValueChange={(value) =>
            saveMutation.mutate({ ...toInput(prospect), stage: value as Stage })
          }
        >
          <SelectTrigger aria-label="Stage" className="data-[size=default]:h-9 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SALES_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="size-9" aria-label="Edit prospect" onClick={onEdit}>
          <Pencil />
        </Button>
      </div>
    </li>
  )
}

type CenterOption = { id: string; name: string }

function ProspectForm({
  prospect,
  onDone,
}: {
  prospect: SalesProspectRow | null
  onDone: () => void
}) {
  const { data: centers = [] } = useQuery(allCentersQuery)
  const [form, setForm] = useState(() => ({
    organization: prospect?.organization ?? "",
    contactName: prospect?.contactName ?? "",
    phone: prospect?.phone ?? "",
    stage: prospect?.stage ?? ("contacted" as Stage),
    lostReason: prospect?.lostReason ?? "",
    notes: prospect?.notes ?? "",
    nextFollowUpOn: prospect?.nextFollowUpAt ? toMytDay(prospect.nextFollowUpAt.getTime()) : "",
  }))
  const [center, setCenter] = useState<CenterOption | null>(
    prospect?.dialysisCenterId
      ? { id: prospect.dialysisCenterId, name: prospect.centerName ?? "" }
      : null
  )
  const saveMutation = useSaveProspect(() => {
    toast.success("Prospect saved")
    onDone()
  })

  const centerOptions = centers.map((c) => ({
    id: c.id,
    name: [c.dialysisCenterName, c.town].filter(Boolean).join(" · "),
  }))
  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{prospect ? "Edit prospect" : "New prospect"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate({
              id: prospect?.id,
              organization: form.organization,
              dialysisCenterId: center?.id ?? null,
              contactName: form.contactName,
              phone: form.phone,
              stage: form.stage,
              lostReason: form.stage === "lost" ? form.lostReason : null,
              notes: form.notes,
              nextFollowUpAt: form.nextFollowUpOn
                ? new Date(`${form.nextFollowUpOn}T09:00:00+08:00`)
                : null,
            })
          }}
        >
          <Field>
            <FieldLabel htmlFor="prospect-organization">Organisation or chain</FieldLabel>
            <Input
              id="prospect-organization"
              required
              value={form.organization}
              onChange={set("organization")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="prospect-center">Centre (optional)</FieldLabel>
            <Combobox
              items={centerOptions}
              value={center}
              onValueChange={setCenter}
              itemToStringLabel={(item: CenterOption) => item.name}
              isItemEqualToValue={(item: CenterOption, value: CenterOption) => item.id === value.id}
            >
              <ComboboxInput id="prospect-center" placeholder="Search centres" showClear />
              <ComboboxContent>
                <ComboboxEmpty>No centres found.</ComboboxEmpty>
                <ComboboxList>
                  {(item: CenterOption) => (
                    <ComboboxItem key={item.id} value={item}>
                      {item.name}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
          <Field>
            <FieldLabel htmlFor="prospect-contact">Contact name</FieldLabel>
            <Input id="prospect-contact" value={form.contactName} onChange={set("contactName")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="prospect-phone">Phone</FieldLabel>
            <Input id="prospect-phone" inputMode="tel" value={form.phone} onChange={set("phone")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="prospect-stage">Stage</FieldLabel>
            <Select
              value={form.stage}
              onValueChange={(value) => setForm((prev) => ({ ...prev, stage: value as Stage }))}
            >
              <SelectTrigger id="prospect-stage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALES_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="prospect-follow-up">Next follow-up</FieldLabel>
            <Input
              id="prospect-follow-up"
              type="date"
              value={form.nextFollowUpOn}
              onChange={set("nextFollowUpOn")}
            />
          </Field>
          {form.stage === "lost" && (
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="prospect-lost-reason">Lost reason</FieldLabel>
              <Input id="prospect-lost-reason" value={form.lostReason} onChange={set("lostReason")} />
            </Field>
          )}
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="prospect-notes">Notes</FieldLabel>
            <Textarea id="prospect-notes" rows={3} value={form.notes} onChange={set("notes")} />
          </Field>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={saveMutation.isPending} className="h-10">
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="outline" className="h-10" onClick={onDone}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
