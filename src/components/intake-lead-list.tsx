import { useState, type ComponentProps, type ReactNode } from "react"
import {
  AlertCircle,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  MessageCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export const LEAD_STATUSES = ["new", "contacted", "booked", "rejected"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  booked: "Booked",
  rejected: "Not suitable",
}

const LEAD_STATUS_VARIANTS: Record<
  LeadStatus,
  ComponentProps<typeof Badge>["variant"]
> = {
  new: "default",
  contacted: "secondary",
  booked: "outline",
  rejected: "outline",
}

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
  status: string
  createdAt: Date | string | number
}

const PAGE_SIZE = 25
const GRID_WITH_CENTER =
  "sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1fr)_5rem]"
const GRID_WITHOUT_CENTER = "sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_5rem]"

type IntakeLeadListProps = {
  leads: IntakeLeadListItem[]
  emptyMessage: string
  showCenter?: boolean
}

const dateFormatter = new Intl.DateTimeFormat("en-MY", {
  dateStyle: "medium",
})

const shortDateFormatter = new Intl.DateTimeFormat("en-MY", {
  day: "numeric",
  month: "short",
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

function formatAge(value: Date | string | number) {
  const date = toDate(value)
  if (!date) return "-"
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d ago`
  return date.getFullYear() === new Date().getFullYear()
    ? shortDateFormatter.format(date)
    : dateFormatter.format(date)
}

export function toLeadStatus(status: string): LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(status)
    ? (status as LeadStatus)
    : "new"
}

function getNotificationDescription(lead: IntakeLeadListItem) {
  if (lead.picNotificationStatus === "sent") return null
  if (lead.picNotificationStatus === "skipped_no_email") {
    return "No PIC or center email is configured, so no email was sent."
  }
  if (lead.picNotificationStatus.startsWith("failed")) {
    return `PIC email did not get through${
      lead.picNotificationError ? `: ${lead.picNotificationError}` : "."
    }`
  }
  if (lead.picNotificationStatus === "pending") {
    return "PIC email notification is pending."
  }
  return null
}

export function IntakeLeadList({
  leads,
  emptyMessage,
  showCenter = true,
}: IntakeLeadListProps) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const gridCols = showCenter ? GRID_WITH_CENTER : GRID_WITHOUT_CENTER

  if (leads.length === 0) {
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
          className="hidden items-center gap-2 border-b border-l-2 border-l-transparent bg-muted/40 py-2 pr-3 pl-11 text-xs font-medium text-muted-foreground sm:flex"
        >
          <div className={cn("grid flex-1 gap-4 pr-4", gridCols)}>
            <span>Patient</span>
            {showCenter && <span>Center</span>}
            <span>Preferred slot</span>
            <span className="text-right">Received</span>
          </div>
          <span className="w-24">Status</span>
          <span className="w-9" />
        </div>
        <ul className="divide-y">
          {leads.slice(0, visible).map((lead) => (
            <IntakeLeadRow
              key={lead.id}
              lead={lead}
              showCenter={showCenter}
              gridCols={gridCols}
            />
          ))}
        </ul>
      </div>
      {visible < leads.length && (
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            Showing {visible} of {leads.length}
          </span>
          <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Show more
          </Button>
        </div>
      )}
    </div>
  )
}

function IntakeLeadRow({
  lead,
  showCenter,
  gridCols,
}: {
  lead: IntakeLeadListItem
  showCenter: boolean
  gridCols: string
}) {
  const status = toLeadStatus(lead.status)
  const isNew = status === "new"
  const notificationIssue = getNotificationDescription(lead)
  const notificationFailed = lead.picNotificationStatus.startsWith("failed")

  return (
    <Collapsible asChild>
      <li
        className={cn(
          "group/lead border-l-2 border-l-transparent",
          isNew && "border-l-primary bg-primary/5"
        )}
      >
        <div className="flex items-center gap-2 pr-2 sm:pr-3">
          <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-4">
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/lead:rotate-180" />
            <div className={cn("min-w-0 flex-1 sm:grid sm:items-center sm:gap-4", gridCols)}>
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "truncate text-sm",
                    isNew ? "font-semibold" : "font-medium"
                  )}
                >
                  {lead.fullName}
                </span>
                {notificationFailed && (
                  <AlertCircle
                    className="size-4 shrink-0 text-destructive"
                    aria-label="PIC email failed"
                  />
                )}
              </div>
              {showCenter && (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">
                  {lead.centerName}
                  {lead.centerTown ? ` · ${lead.centerTown}` : ""}
                </p>
              )}
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                <span className="sr-only">Preferred </span>
                {formatDate(lead.preferredDate)} · {lead.preferredSession}
              </p>
              <span className="hidden text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums sm:inline">
                {formatAge(lead.createdAt)}
              </span>
            </div>
          </CollapsibleTrigger>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:w-24 sm:items-start">
            <Badge
              variant={LEAD_STATUS_VARIANTS[status]}
              className={cn(status === "rejected" && "text-muted-foreground")}
            >
              {status === "booked" && <Check />}
              {LEAD_STATUS_LABELS[status]}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums sm:hidden">
              {formatAge(lead.createdAt)}
            </span>
          </div>
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="size-9 shrink-0"
          >
            <a
              href={lead.whatsappHandoffUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`WhatsApp ${lead.fullName}`}
            >
              <MessageCircle />
            </a>
          </Button>
        </div>

        <CollapsibleContent className="border-t bg-muted/30 px-4 py-4 text-sm sm:pl-11">
          <dl className="grid gap-3 sm:grid-cols-3">
            <Detail label="Phone">
              <a className="underline-offset-4 hover:underline" href={`tel:${lead.phoneNumber}`}>
                {lead.phoneNumber}
              </a>
            </Detail>
            <Detail label="MyKad">{lead.myKadNumber}</Detail>
            <Detail label="Submitted">{formatDateTime(lead.createdAt)}</Detail>
            <Detail label="Address" className="sm:col-span-2">
              {lead.homeAddress}
            </Detail>
            <Detail label="PIC viewed">
              {lead.viewedAt ? formatDateTime(lead.viewedAt) : "Not yet"}
            </Detail>
            {lead.additionalNotes && (
              <Detail label="Notes" className="sm:col-span-3">
                {lead.additionalNotes}
              </Detail>
            )}
          </dl>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
            {lead.labResultOriginalName && (
              <span className="inline-flex items-center gap-1">
                <FileText className="size-4" />
                {lead.labResultOriginalName}
              </span>
            )}
            <span>Lead link expires {formatDateTime(lead.accessExpiresAt)}</span>
            <Button asChild size="sm" className="ml-auto">
              <a href={lead.whatsappHandoffUrl} target="_blank" rel="noreferrer">
                <MessageCircle />
                WhatsApp
                <ExternalLink />
              </a>
            </Button>
          </div>
          {notificationIssue && (
            <p
              className={cn(
                "mt-3",
                lead.picNotificationStatus === "pending"
                  ? "text-muted-foreground"
                  : "text-destructive"
              )}
            >
              {notificationIssue}
            </p>
          )}
        </CollapsibleContent>
      </li>
    </Collapsible>
  )
}

function Detail({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}
