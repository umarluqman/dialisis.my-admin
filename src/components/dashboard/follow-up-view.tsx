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
        title: "You may not have received these",
        description:
          "Sent before 24 Sep 2026. Our email to your centre did not go through, so no one may have called these patients yet.",
      },
      stale: {
        title: "Waiting more than 2 days",
        description: "The patient sent this over 48 hours ago and has not been marked as contacted.",
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
      "Everyone has been contacted. A request appears here if no one has reached the patient within 2 days.",
    explainerTitle: "These patients may still be waiting for you",
    explainerBug:
      "Before 24 Sep 2026, some appointment requests never reached centres by email. Those patients may think their booking is confirmed and are still waiting for a call.",
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
        title: "Anda mungkin tidak menerima permohonan ini",
        description:
          "Dihantar sebelum 24 Sep 2026. E-mel kami kepada pusat anda tidak sampai, jadi pesakit ini mungkin belum dihubungi.",
      },
      stale: {
        title: "Menunggu lebih 2 hari",
        description: "Pesakit menghantar permohonan ini lebih 48 jam lalu dan masih belum ditandakan sebagai dihubungi.",
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
      "Semua pesakit telah dihubungi. Permohonan dipaparkan di sini jika pesakit belum dihubungi dalam masa 2 hari.",
    explainerTitle: "Pesakit ini mungkin masih menunggu anda",
    explainerBug:
      "Sebelum 24 Sep 2026, sebahagian permohonan temujanji tidak sampai ke pusat melalui e-mel. Pesakit tersebut mungkin menyangka temujanji mereka telah disahkan dan masih menunggu panggilan.",
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
