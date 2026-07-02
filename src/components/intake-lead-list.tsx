import type { ComponentProps } from "react"
import { ExternalLink, FileText, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type IntakeLeadListItem = {
  id: string
  dialysisCenterId: string
  centerName: string
  centerTown: string | null
  fullName: string
  myKadNumber: string
  homeAddress: string
  preferredDate: Date | string | number
  preferredSession: string
  phoneNumber: string
  labResultOriginalName: string | null
  additionalNotes: string | null
  whatsappHandoffUrl: string
  picNotificationStatus: string
  picNotificationMessageId: string | null
  picNotificationError: string | null
  accessExpiresAt: Date | string | number
  viewedAt: Date | string | number | null
  createdAt: Date | string | number
}

type IntakeLeadListProps = {
  leads: IntakeLeadListItem[]
  emptyMessage: string
  showCenter?: boolean
}

const dateFormatter = new Intl.DateTimeFormat("en-MY", {
  dateStyle: "medium",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-MY", {
  dateStyle: "medium",
  timeStyle: "short",
})

function toDate(value: Date | string | number | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value: Date | string | number) {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : "-"
}

function formatDateTime(value: Date | string | number | null) {
  const date = toDate(value)
  return date ? dateTimeFormatter.format(date) : "-"
}

function getStatusVariant(
  status: string
): ComponentProps<typeof Badge>["variant"] {
  if (status === "sent") return "default"
  if (status.startsWith("failed")) return "destructive"
  return "outline"
}

function getStatusLabel(status: string) {
  return status.replaceAll("_", " ")
}

export function IntakeLeadList({
  leads,
  emptyMessage,
  showCenter = true,
}: IntakeLeadListProps) {
  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <div key={lead.id} className="rounded-lg border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{lead.fullName}</h3>
                <Badge variant={getStatusVariant(lead.picNotificationStatus)}>
                  {getStatusLabel(lead.picNotificationStatus)}
                </Badge>
              </div>
              {showCenter && (
                <p className="text-sm text-muted-foreground">
                  {lead.centerName}
                  {lead.centerTown ? `, ${lead.centerTown}` : ""}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Submitted {formatDateTime(lead.createdAt)}
              </p>
            </div>
            <Button asChild size="sm">
              <a
                href={lead.whatsappHandoffUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle />
                WhatsApp
                <ExternalLink />
              </a>
            </Button>
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">MyKad</p>
              <p>{lead.myKadNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p>{lead.phoneNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Appointment</p>
              <p>
                {formatDate(lead.preferredDate)} · {lead.preferredSession}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">PIC viewed</p>
              <p>{lead.viewedAt ? formatDateTime(lead.viewedAt) : "Not yet"}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Address</p>
              <p>{lead.homeAddress}</p>
            </div>
            {lead.additionalNotes && (
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p>{lead.additionalNotes}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-muted-foreground">
              {lead.labResultOriginalName && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="size-4" />
                  {lead.labResultOriginalName}
                </span>
              )}
              <span>Lead link expires {formatDateTime(lead.accessExpiresAt)}</span>
            </div>
            {lead.picNotificationError && (
              <p className="text-destructive">{lead.picNotificationError}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
