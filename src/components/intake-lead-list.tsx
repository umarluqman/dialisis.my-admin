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
import type { LeadQuality } from "@/lib/lead-quality"
import {
  dateFormats,
  defineCopy,
  useCopy,
  useLocale,
  type Locale,
} from "@/lib/i18n"
import { cn } from "@/lib/utils"

export const LEAD_STATUSES = ["new", "contacted", "booked", "rejected"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_COPY = defineCopy({
  en: {
    new: "New",
    contacted: "Contacted",
    booked: "Booked",
    rejected: "Not suitable",
  } satisfies Record<LeadStatus, string>,
  ms: {
    new: "Baru",
    contacted: "Dihubungi",
    booked: "Ditempah",
    rejected: "Tidak sesuai",
  },
})

const COPY = defineCopy({
  en: {
    patient: "Patient",
    center: "Center",
    preferredSlot: "Preferred slot",
    received: "Received",
    status: "Status",
    showing: (visible: number, total: number) => `Showing ${visible} of ${total}`,
    showMore: "Show more",
    picEmailFailed: "PIC email failed",
    test: "Test",
    beforeFix: "Before fix",
    beforeFixTitle: "Submitted before the lead delivery fix on 24 Sep 2026",
    duplicate: "Duplicate",
    duplicateTitle: "Same phone submitted to this center earlier the same day",
    preferredSr: "Preferred ",
    phone: "Phone",
    submitted: "Submitted",
    address: "Address",
    picViewed: "PIC viewed",
    notYet: "Not yet",
    notes: "Notes",
    linkExpires: (date: string) => `Lead link expires ${date}`,
    noEmail: "No PIC or center email is configured, so no email was sent.",
    emailFailed: (error: string | null) =>
      `PIC email did not get through${error ? `: ${error}` : "."}`,
    emailPending: "PIC email notification is pending.",
    justNow: "just now",
    minutesAgo: (n: number) => `${n}m ago`,
    hoursAgo: (n: number) => `${n}h ago`,
    daysAgo: (n: number) => `${n}d ago`,
  },
  ms: {
    patient: "Pesakit",
    center: "Pusat",
    preferredSlot: "Tarikh & sesi",
    received: "Diterima",
    status: "Status",
    showing: (visible: number, total: number) =>
      `Memaparkan ${visible} daripada ${total}`,
    showMore: "Lihat lagi",
    picEmailFailed: "E-mel PIC gagal",
    test: "Ujian",
    beforeFix: "Sebelum pembetulan",
    beforeFixTitle:
      "Dihantar sebelum pembetulan penghantaran permohonan pada 24 Sep 2026",
    duplicate: "Pendua",
    duplicateTitle:
      "No. telefon yang sama dihantar ke pusat ini lebih awal pada hari yang sama",
    preferredSr: "Tarikh pilihan ",
    phone: "No. telefon",
    submitted: "Dihantar",
    address: "Alamat",
    picViewed: "Dilihat PIC",
    notYet: "Belum",
    notes: "Catatan",
    linkExpires: (date: string) => `Pautan permohonan tamat tempoh pada ${date}`,
    noEmail:
      "Tiada e-mel PIC atau pusat ditetapkan, jadi tiada e-mel dihantar.",
    emailFailed: (error: string | null) =>
      `E-mel PIC gagal dihantar${error ? `: ${error}` : "."}`,
    emailPending: "Pemberitahuan e-mel PIC belum selesai.",
    justNow: "baru sahaja",
    minutesAgo: (n: number) => `${n} min lalu`,
    hoursAgo: (n: number) => `${n} jam lalu`,
    daysAgo: (n: number) => `${n} hari lalu`,
  },
})

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
  quality: LeadQuality
  duplicateKey: string
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

const dateFormatter = dateFormats({ dateStyle: "medium" })

const shortDateFormatter = dateFormats({ day: "numeric", month: "short" })

const dateTimeFormatter = dateFormats({
  dateStyle: "medium",
  timeStyle: "short",
})

function toDate(value: Date | string | number | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: Date | string | number, locale: Locale) {
  const date = toDate(value)
  return date ? dateFormatter[locale].format(date) : "-"
}

function formatDateTime(value: Date | string | number | null, locale: Locale) {
  const date = toDate(value)
  return date ? dateTimeFormatter[locale].format(date) : "-"
}

export function formatAge(value: Date | string | number, locale: Locale) {
  const date = toDate(value)
  if (!date) return "-"
  const t = COPY[locale]
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return t.justNow
  if (minutes < 60) return t.minutesAgo(minutes)
  if (minutes < 60 * 24) return t.hoursAgo(Math.floor(minutes / 60))
  if (minutes < 60 * 24 * 7) return t.daysAgo(Math.floor(minutes / (60 * 24)))
  return date.getFullYear() === new Date().getFullYear()
    ? shortDateFormatter[locale].format(date)
    : dateFormatter[locale].format(date)
}

export function toLeadStatus(status: string): LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(status)
    ? (status as LeadStatus)
    : "new"
}

function getNotificationDescription(
  lead: IntakeLeadListItem,
  t: (typeof COPY)["en"]
) {
  if (lead.picNotificationStatus === "sent") return null
  if (lead.picNotificationStatus === "skipped_no_email") {
    return t.noEmail
  }
  if (lead.picNotificationStatus.startsWith("failed")) {
    return t.emailFailed(lead.picNotificationError)
  }
  if (lead.picNotificationStatus === "pending") {
    return t.emailPending
  }
  return null
}

export function IntakeLeadList({
  leads,
  emptyMessage,
  showCenter = true,
}: IntakeLeadListProps) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const t = useCopy(COPY)
  const gridCols = showCenter ? GRID_WITH_CENTER : GRID_WITHOUT_CENTER
  const seenKeys = new Set<string>()
  const duplicateIds = new Set<string>()
  for (const lead of leads) {
    if (seenKeys.has(lead.duplicateKey)) duplicateIds.add(lead.id)
    seenKeys.add(lead.duplicateKey)
  }

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
            <span>{t.patient}</span>
            {showCenter && <span>{t.center}</span>}
            <span>{t.preferredSlot}</span>
            <span className="text-right">{t.received}</span>
          </div>
          <span className="w-24">{t.status}</span>
          <span className="w-9" />
        </div>
        <ul className="divide-y">
          {leads.slice(0, visible).map((lead) => (
            <IntakeLeadRow
              key={lead.id}
              lead={lead}
              showCenter={showCenter}
              gridCols={gridCols}
              isDuplicate={duplicateIds.has(lead.id)}
            />
          ))}
        </ul>
      </div>
      {visible < leads.length && (
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {t.showing(visible, leads.length)}
          </span>
          <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            {t.showMore}
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
  isDuplicate,
}: {
  lead: IntakeLeadListItem
  showCenter: boolean
  gridCols: string
  isDuplicate: boolean
}) {
  const t = useCopy(COPY)
  const statusLabels = useCopy(LEAD_STATUS_COPY)
  const { locale } = useLocale()
  const status = toLeadStatus(lead.status)
  const isTest = lead.quality === "test"
  const isNew = status === "new" && !isTest
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
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "max-w-full truncate text-sm",
                    isNew ? "font-semibold" : "font-medium"
                  )}
                >
                  {lead.fullName}
                </span>
                {notificationFailed && (
                  <AlertCircle
                    className="size-4 shrink-0 text-destructive"
                    aria-label={t.picEmailFailed}
                  />
                )}
                {isTest ? (
                  <Badge variant="outline" className="text-muted-foreground">{t.test}</Badge>
                ) : (
                  lead.quality === "invalid" && (
                    <Badge variant="outline" title={t.beforeFixTitle}>
                      {t.beforeFix}
                    </Badge>
                  )
                )}
                {isDuplicate && (
                  <Badge variant="outline" className="text-muted-foreground" title={t.duplicateTitle}>
                    {t.duplicate}
                  </Badge>
                )}
              </div>
              {showCenter && (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">
                  {lead.centerName}
                  {lead.centerTown ? ` · ${lead.centerTown}` : ""}
                </p>
              )}
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                <span className="sr-only">{t.preferredSr}</span>
                {formatDate(lead.preferredDate, locale)} · {lead.preferredSession}
              </p>
              <span className="hidden text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums sm:inline">
                {formatAge(lead.createdAt, locale)}
              </span>
            </div>
          </CollapsibleTrigger>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:w-24 sm:items-start">
            <Badge
              variant={LEAD_STATUS_VARIANTS[status]}
              className={cn(status === "rejected" && "text-muted-foreground")}
            >
              {status === "booked" && <Check />}
              {statusLabels[status]}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums sm:hidden">
              {formatAge(lead.createdAt, locale)}
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
          <IntakeLeadDetails lead={lead} />
        </CollapsibleContent>
      </li>
    </Collapsible>
  )
}

export function IntakeLeadDetails({ lead }: { lead: IntakeLeadListItem }) {
  const t = useCopy(COPY)
  const { locale } = useLocale()
  const notificationIssue = getNotificationDescription(lead, t)

  return (
    <>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Detail label={t.phone}>
          <a className="underline-offset-4 hover:underline" href={`tel:${lead.phoneNumber}`}>
            {lead.phoneNumber}
          </a>
        </Detail>
        <Detail label="MyKad">{lead.myKadNumber}</Detail>
        <Detail label={t.submitted}>{formatDateTime(lead.createdAt, locale)}</Detail>
        <Detail label={t.address} className="sm:col-span-2">
          {lead.homeAddress}
        </Detail>
        <Detail label={t.picViewed}>
          {lead.viewedAt ? formatDateTime(lead.viewedAt, locale) : t.notYet}
        </Detail>
        {lead.additionalNotes && (
          <Detail label={t.notes} className="sm:col-span-3">
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
        <span>{t.linkExpires(formatDateTime(lead.accessExpiresAt, locale))}</span>
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
    </>
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
