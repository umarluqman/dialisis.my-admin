import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, ChevronDown, MessageCircle, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  IntakeLeadDetails,
  LEAD_STATUS_COPY,
  formatAge,
  formatDate,
} from "@/components/intake-lead-list"
import {
  getFollowUpLeads,
  updateIntakeLeadStatus,
} from "@/core/functions/intake-lead-functions"
import { defineCopy, useCopy, useLocale } from "@/lib/i18n"
import { followUpLeadsQuery } from "./queries"

type FollowUpLead = Awaited<ReturnType<typeof getFollowUpLeads>>[number]

const OUTCOMES = ["contacted", "booked", "rejected"] as const
type Outcome = (typeof OUTCOMES)[number]

const SECTIONS = ["invalid", "stale"] as const
type Section = (typeof SECTIONS)[number]

const COPY = defineCopy({
  en: {
    sections: {
      invalid: {
        title: "Before fix (delivery issue)",
        description:
          "Sent before 24 Sep 2026, 7:12 PM. The center was probably never told about these requests.",
      },
      stale: {
        title: "No response > 48h",
        description: "Still marked New more than 48 hours after the patient asked.",
      },
    } satisfies Record<Section, { title: string; description: string }>,
    emailFailed: "Email failed",
    noEmailSent: "No email sent",
    emailOpened: "Email opened",
    sentNotOpened: "Sent, not opened",
    emailPending: "Email pending",
    updateFailed: "Failed to update lead",
    marked: (name: string, status: string) => `${name} marked as ${status}`,
    loadFailed: "Failed to load leads.",
    empty:
      "Nothing needs follow-up. Requests show up here if they are still New after 48 hours.",
    explainerTitle: "These patients may still be waiting for you",
    explainerBug:
      "Until 24 Sep 2026, 7:12 PM, a bug stopped appointment requests from reaching centers by email. Some patients may have been told their booking was confirmed, and most never got a call.",
    explainerAction:
      "Call or WhatsApp each patient, then mark the outcome. Handled requests leave this list.",
    submittedTimes: (count: number) => `Submitted ${count}×`,
    preferredSr: "Preferred ",
    call: (name: string) => `Call ${name}`,
    markOutcome: "Mark outcome",
  },
  ms: {
    sections: {
      invalid: {
        title: "Sebelum pembetulan (isu penghantaran)",
        description:
          "Dihantar sebelum 24 Sep 2026, 7:12 PTG. Pusat mungkin tidak pernah dimaklumkan tentang permohonan ini.",
      },
      stale: {
        title: "Tiada maklum balas > 48 jam",
        description: "Masih berstatus Baru lebih daripada 48 jam selepas pesakit memohon.",
      },
    },
    emailFailed: "E-mel gagal",
    noEmailSent: "Tiada e-mel dihantar",
    emailOpened: "E-mel dibuka",
    sentNotOpened: "Dihantar, belum dibuka",
    emailPending: "E-mel belum selesai",
    updateFailed: "Gagal mengemas kini permohonan",
    marked: (name: string, status: string) => `${name} ditandakan sebagai ${status}`,
    loadFailed: "Gagal memuatkan permohonan.",
    empty:
      "Tiada permohonan yang perlu susulan. Permohonan dipaparkan di sini jika masih Baru selepas 48 jam.",
    explainerTitle: "Pesakit ini mungkin masih menunggu anda",
    explainerBug:
      "Sehingga 24 Sep 2026, 7:12 PTG, satu pepijat menghalang permohonan temujanji daripada sampai ke pusat melalui e-mel. Sesetengah pesakit mungkin dimaklumkan bahawa temujanji mereka telah disahkan, dan kebanyakannya tidak pernah menerima panggilan.",
    explainerAction:
      "Hubungi setiap pesakit melalui telefon atau WhatsApp, kemudian tandakan hasilnya. Permohonan yang telah diuruskan akan dikeluarkan daripada senarai ini.",
    submittedTimes: (count: number) => `Dihantar ${count}×`,
    preferredSr: "Tarikh pilihan ",
    call: (name: string) => `Panggil ${name}`,
    markOutcome: "Tandakan hasil",
  },
})

function getDelivery(lead: FollowUpLead, t: (typeof COPY)["en"]) {
  const status = lead.picNotificationStatus
  if (status.startsWith("failed")) return { label: t.emailFailed, variant: "destructive" } as const
  if (status.startsWith("skipped")) return { label: t.noEmailSent, variant: "outline" } as const
  if (status === "sent") {
    return { label: lead.viewedAt ? t.emailOpened : t.sentNotOpened, variant: "outline" } as const
  }
  return { label: t.emailPending, variant: "outline" } as const
}

export function FollowUpView() {
  const queryClient = useQueryClient()
  const { data: leads = [], isLoading, error } = useQuery(followUpLeadsQuery)
  const t = useCopy(COPY)
  const statusLabels = useCopy(LEAD_STATUS_COPY)

  const mutation = useMutation({
    mutationFn: ({ lead, status }: { lead: FollowUpLead; status: Outcome }) =>
      updateIntakeLeadStatus({ data: { ids: lead.ids, status } }),
    onMutate: async ({ lead }) => {
      await queryClient.cancelQueries({ queryKey: followUpLeadsQuery.queryKey })
      const previous = queryClient.getQueryData(followUpLeadsQuery.queryKey)
      queryClient.setQueryData(followUpLeadsQuery.queryKey, (old) =>
        old?.filter((item) => item.id !== lead.id)
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(followUpLeadsQuery.queryKey, context?.previous)
      toast.error(err.message || t.updateFailed)
    },
    onSuccess: (_data, { lead, status }) => {
      toast.success(t.marked(lead.fullName, statusLabels[status]))
    },
    onSettled: () => {
      for (const queryKey of [["followUpLeads"], ["intakeLeads"], ["analytics"]]) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
  })

  if (error) {
    return (
      <p className="rounded-lg border p-8 text-center text-destructive">
        {error.message || t.loadFailed}
      </p>
    )
  }

  if (isLoading) {
    return (
      <div className="divide-y rounded-lg border bg-card">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4">
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t.empty}
      </div>
    )
  }

  const hasInvalid = leads.some((lead) => lead.reason === "invalid")

  return (
    <div className="space-y-6">
      {hasInvalid && (
        <section
          aria-labelledby="follow-up-explainer"
          className="flex gap-3 rounded-lg border bg-card p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="space-y-1.5">
            <h2 id="follow-up-explainer" className="font-medium">
              {t.explainerTitle}
            </h2>
            <p className="text-muted-foreground">{t.explainerBug}</p>
            <p className="text-muted-foreground">{t.explainerAction}</p>
          </div>
        </section>
      )}

      {SECTIONS.map((reason) => {
        const sectionLeads = leads.filter((lead) => lead.reason === reason)
        if (sectionLeads.length === 0) return null
        const headingId = `follow-up-${reason}`

        return (
          <section key={reason} aria-labelledby={headingId} className="space-y-2">
            <div>
              <h2 id={headingId} className="flex items-baseline gap-2 text-sm font-medium">
                {t.sections[reason].title}
                <span className="text-muted-foreground tabular-nums">{sectionLeads.length}</span>
              </h2>
              <p className="text-xs text-muted-foreground">{t.sections[reason].description}</p>
            </div>
            <ul className="divide-y overflow-hidden rounded-lg border bg-card">
              {sectionLeads.map((lead) => (
                <FollowUpRow
                  key={lead.id}
                  lead={lead}
                  onMark={(status) => mutation.mutate({ lead, status })}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function FollowUpRow({
  lead,
  onMark,
}: {
  lead: FollowUpLead
  onMark: (status: Outcome) => void
}) {
  const t = useCopy(COPY)
  const statusLabels = useCopy(LEAD_STATUS_COPY)
  const { locale } = useLocale()
  const delivery = getDelivery(lead, t)

  return (
    <Collapsible asChild>
      <li className="group/lead">
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
          <CollapsibleTrigger className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/lead:rotate-180" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate text-sm font-semibold">{lead.fullName}</span>
                <Badge variant={delivery.variant}>{delivery.label}</Badge>
                {lead.ids.length > 1 && (
                  <Badge variant="secondary">{t.submittedTimes(lead.ids.length)}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {lead.centerName}
                {lead.centerTown ? ` · ${lead.centerTown}` : ""}
                <span aria-hidden> · </span>
                <span className="whitespace-nowrap">
                  <span className="sr-only">{t.preferredSr}</span>
                  {formatDate(lead.preferredDate, locale)}, {lead.preferredSession}
                </span>
              </p>
            </div>
            <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {formatAge(lead.createdAt, locale)}
            </span>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2 pl-7 sm:pl-0">
            <Button asChild size="icon-lg" variant="outline">
              <a href={`tel:${lead.phoneNumber}`} aria-label={t.call(lead.fullName)}>
                <Phone />
              </a>
            </Button>
            <Button asChild size="icon-lg" variant="outline">
              <a
                href={lead.whatsappHandoffUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp ${lead.fullName}`}
              >
                <MessageCircle />
              </a>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="ml-auto h-9 sm:ml-0">
                  {t.markOutcome}
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {OUTCOMES.map((status) => (
                  <DropdownMenuItem key={status} onSelect={() => onMark(status)}>
                    {statusLabels[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CollapsibleContent className="border-t bg-muted/30 px-4 py-4 text-sm sm:pl-11">
          <IntakeLeadDetails lead={lead} />
        </CollapsibleContent>
      </li>
    </Collapsible>
  )
}
