import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { List, Mail, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  saveSalesProspect,
  type SalesProspectRow,
} from "@/core/functions/sales-functions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { Field, FieldLabel } from "@/components/ui/field"
import { ProInterestCard } from "./pro-interest-card"
import { ColdEmailStudio } from "./cold-email-studio"
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
import { defineCopy, useCopy } from "@/lib/i18n"
import { allCentersQuery, coldEmailConfigQuery, salesProspectsQuery } from "./queries"

type Stage = (typeof SALES_STAGES)[number]
type SalesTab = "studio" | "pipeline"

const COPY = defineCopy({
  en: {
    stages: {
      lead: "To contact",
      contacted: "Contacted",
      demo: "Demo",
      pilot: "Pilot",
      paid: "Paid",
      lost: "Lost",
    } satisfies Record<Stage, string>,
    saveFailed: "Failed to save prospect",
    thisWeekLabel: "Pipeline metrics",
    readyToEmail: "Ready to email",
    thisWeek: (stage: string) => `${stage} this week`,
    lastWeek: (count: number) => `Last week ${count}`,
    zohoConnected: "Zoho Mail connected",
    zohoManual: "Manual Zoho / Copy mode",
    sentProgress: (sent: number, total: number) => `Sent ${sent} / ${total} prospects`,
    studioTab: "Cold Email Studio",
    pipelineTab: "Pipeline List",
    openEmailStudio: "Open in Cold Email Studio",
    filterByStage: "Filter by stage",
    all: "All",
    addProspect: "Add prospect",
    loadFailed: "Failed to load prospects.",
    loading: "Loading prospects...",
    noneInStage: "No prospects in this stage.",
    noneYet: "No prospects yet.",
    lostReasonLine: (reason: string) => `Lost: ${reason}`,
    followUp: (date: string) => `Follow up ${date}`,
    stage: "Stage",
    editProspect: "Edit prospect",
    saved: "Prospect saved",
    newProspect: "New prospect",
    organization: "Organisation or chain",
    centres: "Centres (optional)",
    searchCentres: "Search centres",
    noCentres: "No centres found.",
    contactName: "Contact name",
    phone: "Phone",
    email: "Email",
    nextFollowUp: "Next follow-up",
    lostReason: "Lost reason",
    notes: "Notes",
    saving: "Saving...",
    save: "Save",
    cancel: "Cancel",
  },
  ms: {
    stages: {
      lead: "Belum dihubungi",
      contacted: "Dihubungi",
      demo: "Demo",
      pilot: "Percubaan",
      paid: "Berbayar",
      lost: "Terlepas",
    },
    saveFailed: "Gagal menyimpan prospek",
    thisWeekLabel: "Metrik saluran jualan",
    readyToEmail: "Sedia untuk emel",
    thisWeek: (stage: string) => `${stage} minggu ini`,
    lastWeek: (count: number) => `Minggu lepas ${count}`,
    zohoConnected: "Zoho Mail disambungkan",
    zohoManual: "Mod Manual Zoho / Salin",
    sentProgress: (sent: number, total: number) => `Dihantar ${sent} / ${total} prospek`,
    studioTab: "Studio Emel Dingin",
    pipelineTab: "Senarai Prospek",
    openEmailStudio: "Buka di Studio Emel Dingin",
    filterByStage: "Tapis mengikut peringkat",
    all: "Semua",
    addProspect: "Tambah prospek",
    loadFailed: "Gagal memuatkan prospek.",
    loading: "Memuatkan prospek...",
    noneInStage: "Tiada prospek pada peringkat ini.",
    noneYet: "Belum ada prospek.",
    lostReasonLine: (reason: string) => `Terlepas: ${reason}`,
    followUp: (date: string) => `Susulan ${date}`,
    stage: "Peringkat",
    editProspect: "Sunting prospek",
    saved: "Prospek disimpan",
    newProspect: "Prospek baru",
    organization: "Organisasi atau rangkaian",
    centres: "Pusat (tidak wajib)",
    searchCentres: "Cari pusat",
    noCentres: "Tiada pusat dijumpai.",
    contactName: "Nama kenalan",
    phone: "No. telefon",
    email: "Emel",
    nextFollowUp: "Susulan seterusnya",
    lostReason: "Sebab terlepas",
    notes: "Catatan",
    saving: "Menyimpan...",
    save: "Simpan",
    cancel: "Batal",
  },
})

type ProspectInput = Parameters<typeof saveSalesProspect>[0]["data"]

function useSaveProspect(onSaved?: () => void) {
  const t = useCopy(COPY)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ProspectInput) => saveSalesProspect({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesProspects"] })
      onSaved?.()
    },
    onError: (error) => toast.error(error.message || t.saveFailed),
  })
}

function toInput(prospect: SalesProspectRow): ProspectInput {
  return {
    id: prospect.id,
    organization: prospect.organization,
    dialysisCenterIds: prospect.centers.map((c) => c.id),
    contactName: prospect.contactName,
    phone: prospect.phone,
    email: prospect.email,
    stage: prospect.stage,
    lostReason: prospect.lostReason,
    notes: prospect.notes,
    nextFollowUpAt: prospect.nextFollowUpAt,
  }
}

export function SalesView() {
  const t = useCopy(COPY)
  const { data: prospects = [], isLoading, error } = useQuery(salesProspectsQuery)
  const { data: emailConfig } = useQuery(coldEmailConfigQuery)
  const [view, setView] = useState<SalesTab>("studio")
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage | undefined>()
  const [editing, setEditing] = useState<SalesProspectRow | "new" | null>(null)

  const scorecard = weeklyScorecard(prospects)
  const leadCount = prospects.filter((p) => p.stage === "lead").length
  const sentCount = prospects.filter((p) => p.emailSentAt != null || p.stage !== "lead").length
  const progressPct = prospects.length > 0 ? Math.round((sentCount / prospects.length) * 100) : 0

  const zohoConfigured = emailConfig?.zohoConfigured ?? false
  const fromEmail = emailConfig?.fromEmail ?? "luqman@dialisis.my"
  const fromName = emailConfig?.fromName ?? "Umar Luqman"

  const filtered = stage ? prospects.filter((p) => p.stage === stage) : prospects
  const chips = [
    { value: undefined, label: t.all, count: prospects.length },
    ...SALES_STAGES.map((s) => ({
      value: s,
      label: t.stages[s],
      count: prospects.filter((p) => p.stage === s).length,
    })),
  ]

  return (
    <div className="space-y-4">
      <section aria-label={t.thisWeekLabel} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card size="sm">
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground">{t.stages.lead}</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{leadCount}</p>
            <p className="text-sm text-muted-foreground">{t.readyToEmail}</p>
          </CardContent>
        </Card>
        {scorecard.map((row) => (
          <Card key={row.stage} size="sm">
            <CardContent>
              <p className="text-sm font-medium text-muted-foreground">
                {t.thisWeek(t.stages[row.stage])}
              </p>
              <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{row.thisWeek}</p>
              <p className="font-mono text-sm text-muted-foreground tabular-nums">
                {t.lastWeek(row.lastWeek)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3.5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-medium text-foreground">{fromEmail}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                zohoConfigured
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  zohoConfigured ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              {zohoConfigured ? t.zohoConnected : t.zohoManual}
            </span>
          </div>

          <div className="flex min-w-[180px] flex-1 items-center gap-2.5">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {t.sentProgress(sentCount, prospects.length)}
            </span>
          </div>
        </div>

        <div className="inline-flex shrink-0 rounded-full border bg-muted/40 p-0.5">
          <Button
            type="button"
            size="sm"
            variant={view === "studio" ? "default" : "ghost"}
            className="h-8 gap-1.5 rounded-full px-3 text-xs"
            onClick={() => setView("studio")}
          >
            <Mail className="size-3.5" />
            {t.studioTab}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "pipeline" ? "default" : "ghost"}
            className="h-8 gap-1.5 rounded-full px-3 text-xs"
            onClick={() => setView("pipeline")}
          >
            <List className="size-3.5" />
            {t.pipelineTab}
          </Button>
        </div>
      </div>

      {view === "studio" ? (
        error ? (
          <p className="rounded-lg border p-8 text-center text-destructive">
            {error.message || t.loadFailed}
          </p>
        ) : isLoading ? (
          <p className="rounded-lg border p-8 text-center text-muted-foreground">{t.loading}</p>
        ) : (
          <ColdEmailStudio
            prospects={prospects}
            selectedId={selectedProspectId}
            onSelectId={setSelectedProspectId}
            zohoConfigured={zohoConfigured}
            fromEmail={fromEmail}
            fromName={fromName}
          />
        )
      ) : (
        <>
          <ProInterestCard />

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label={t.filterByStage}
              className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
            >
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
                  <span className="font-mono tabular-nums opacity-70">{chip.count}</span>
                </Button>
              ))}
            </div>
            <Button className="h-9" onClick={() => setEditing("new")}>
              <Plus />
              {t.addProspect}
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
              {error.message || t.loadFailed}
            </p>
          ) : isLoading ? (
            <p className="rounded-lg border p-8 text-center text-muted-foreground">{t.loading}</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {stage ? t.noneInStage : t.noneYet}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {filtered.map((prospect) => (
                <ProspectRow
                  key={prospect.id}
                  prospect={prospect}
                  onEdit={() => setEditing(prospect)}
                  onOpenStudio={() => {
                    setSelectedProspectId(prospect.id)
                    setView("studio")
                  }}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function ProspectRow({
  prospect,
  onEdit,
  onOpenStudio,
}: {
  prospect: SalesProspectRow
  onEdit: () => void
  onOpenStudio: () => void
}) {
  const t = useCopy(COPY)
  const saveMutation = useSaveProspect()
  const followUp = prospect.nextFollowUpAt
  const overdue =
    followUp && !["paid", "lost"].includes(prospect.stage) && followUp.getTime() < Date.now()

  return (
    <li className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4 md:px-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{prospect.organization}</p>
        <p className="truncate text-sm text-muted-foreground">
          {[prospect.contactName, prospect.email, prospect.phone, ...prospect.centers.map((c) => c.name)]
            .filter(Boolean)
            .join(" · ") || "-"}
        </p>
        {(prospect.stage === "lost" && prospect.lostReason) || prospect.notes ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {prospect.stage === "lost" && prospect.lostReason
              ? t.lostReasonLine(prospect.lostReason)
              : prospect.notes}
          </p>
        ) : null}
      </div>
      {followUp && (
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            overdue ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          {t.followUp(toMytDay(followUp.getTime()))}
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
          <SelectTrigger aria-label={t.stage} className="data-[size=default]:h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SALES_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {t.stages[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          aria-label={t.openEmailStudio}
          onClick={onOpenStudio}
        >
          <Mail />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          aria-label={t.editProspect}
          onClick={onEdit}
        >
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
  const t = useCopy(COPY)
  const { data: centers = [] } = useQuery(allCentersQuery)
  const [form, setForm] = useState(() => ({
    organization: prospect?.organization ?? "",
    contactName: prospect?.contactName ?? "",
    phone: prospect?.phone ?? "",
    email: prospect?.email ?? "",
    stage: prospect?.stage ?? ("lead" as Stage),
    lostReason: prospect?.lostReason ?? "",
    notes: prospect?.notes ?? "",
    nextFollowUpOn: prospect?.nextFollowUpAt ? toMytDay(prospect.nextFollowUpAt.getTime()) : "",
  }))
  const [centerIds, setCenterIds] = useState(() => prospect?.centers.map((c) => c.id) ?? [])
  const centersAnchor = useComboboxAnchor()
  const saveMutation = useSaveProspect(() => {
    toast.success(t.saved)
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
        <CardTitle>{prospect ? t.editProspect : t.newProspect}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate({
              id: prospect?.id,
              organization: form.organization,
              dialysisCenterIds: centerIds,
              contactName: form.contactName,
              phone: form.phone,
              email: form.email,
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
            <FieldLabel htmlFor="prospect-organization">{t.organization}</FieldLabel>
            <Input
              id="prospect-organization"
              required
              value={form.organization}
              onChange={set("organization")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="prospect-center">{t.centres}</FieldLabel>
            <Combobox
              multiple
              items={centerOptions}
              value={centerOptions.filter((c) => centerIds.includes(c.id))}
              onValueChange={(items: CenterOption[]) => setCenterIds(items.map((c) => c.id))}
              itemToStringLabel={(item: CenterOption) => item.name}
              isItemEqualToValue={(item: CenterOption, value: CenterOption) => item.id === value.id}
            >
              <ComboboxChips ref={centersAnchor}>
                <ComboboxValue>
                  {(selected: CenterOption[]) => (
                    <>
                      {selected.map((item) => (
                        <ComboboxChip key={item.id} className="max-w-full">
                          <span className="truncate">{item.name}</span>
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput
                        id="prospect-center"
                        placeholder={selected.length ? undefined : t.searchCentres}
                      />
                    </>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={centersAnchor}>
                <ComboboxEmpty>{t.noCentres}</ComboboxEmpty>
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
            <FieldLabel htmlFor="prospect-contact">{t.contactName}</FieldLabel>
            <Input id="prospect-contact" value={form.contactName} onChange={set("contactName")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="prospect-email">{t.email}</FieldLabel>
            <Input
              id="prospect-email"
              type="email"
              value={form.email}
              onChange={set("email")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="prospect-phone">{t.phone}</FieldLabel>
            <Input id="prospect-phone" inputMode="tel" value={form.phone} onChange={set("phone")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="prospect-stage">{t.stage}</FieldLabel>
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
                    {t.stages[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="prospect-follow-up">{t.nextFollowUp}</FieldLabel>
            <Input
              id="prospect-follow-up"
              type="date"
              value={form.nextFollowUpOn}
              onChange={set("nextFollowUpOn")}
            />
          </Field>
          {form.stage === "lost" && (
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="prospect-lost-reason">{t.lostReason}</FieldLabel>
              <Input id="prospect-lost-reason" value={form.lostReason} onChange={set("lostReason")} />
            </Field>
          )}
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="prospect-notes">{t.notes}</FieldLabel>
            <Textarea id="prospect-notes" rows={3} value={form.notes} onChange={set("notes")} />
          </Field>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={saveMutation.isPending} className="h-10">
              {saveMutation.isPending ? t.saving : t.save}
            </Button>
            <Button type="button" variant="outline" className="h-10" onClick={onDone}>
              {t.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
