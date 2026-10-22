import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { LocaleToggle } from "@/components/locale-toggle"
import {
  IntakeLeadDetails,
  LEAD_STATUS_COPY,
  formatDate,
  toLeadStatus,
} from "@/components/intake-lead-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getIntakeLeads,
  updateIntakeLeadStatus,
} from "@/core/functions/intake-lead-functions"
import { defineCopy, useCopy, useLocale } from "@/lib/i18n"

const OUTCOMES = ["contacted", "booked", "rejected"] as const

const COPY = defineCopy({
  en: {
    backToDashboard: "Back to dashboard",
    notFound: "Lead not found.",
    markOutcome: "Mark outcome",
    updateFailed: "Failed to update lead",
    marked: (status: string) => `Marked as ${status}`,
  },
  ms: {
    backToDashboard: "Kembali ke papan pemuka",
    notFound: "Permohonan tidak dijumpai.",
    markOutcome: "Tandakan hasil",
    updateFailed: "Gagal mengemas kini permohonan",
    marked: (status: string) => `Ditandakan sebagai ${status}`,
  },
})

const leadQuery = (id: string) => ({
  queryKey: ["intakeLeads", id],
  queryFn: () => getIntakeLeads({ data: { id, limit: 1 } }),
})

export const Route = createFileRoute("/leads/$leadId")({
  component: LeadPage,
  loader: ({ params }) => getIntakeLeads({ data: { id: params.leadId, limit: 1 } }),
})

function LeadPage() {
  const { leadId } = Route.useParams()
  const queryClient = useQueryClient()
  const t = useCopy(COPY)
  const statusLabels = useCopy(LEAD_STATUS_COPY)
  const { locale } = useLocale()
  const { data: leads } = useQuery({ ...leadQuery(leadId), initialData: Route.useLoaderData() })
  const lead = leads[0]

  const mutation = useMutation({
    mutationFn: (status: (typeof OUTCOMES)[number]) =>
      updateIntakeLeadStatus({ data: { ids: [leadId], status } }),
    onError: (err) => toast.error(err.message || t.updateFailed),
    onSuccess: (_data, status) => toast.success(t.marked(statusLabels[status])),
    onSettled: () => {
      for (const queryKey of [["intakeLeads"], ["followUpLeads"], ["analytics"]]) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
  })

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-6">
        <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-3 sm:px-4">
          <Button variant="outline" size="icon" asChild className="size-10 shrink-0">
            <Link to="/dashboard" aria-label={t.backToDashboard}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold sm:text-2xl">
              {lead?.fullName ?? t.notFound}
            </h1>
            {lead && (
              <p className="truncate text-sm text-muted-foreground">
                {lead.centerName} · {formatDate(lead.preferredDate, locale)} ·{" "}
                {lead.preferredSession}
              </p>
            )}
          </div>
          <LocaleToggle className="shrink-0" />
        </div>

        {lead && (
          <div className="rounded-lg border bg-card p-4 text-sm">
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="secondary">{statusLabels[toLeadStatus(lead.status)]}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="ml-auto h-9" disabled={mutation.isPending}>
                    {t.markOutcome}
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {OUTCOMES.map((status) => (
                    <DropdownMenuItem key={status} onSelect={() => mutation.mutate(status)}>
                      {statusLabels[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <IntakeLeadDetails lead={lead} />
          </div>
        )}
      </div>
    </div>
  )
}
