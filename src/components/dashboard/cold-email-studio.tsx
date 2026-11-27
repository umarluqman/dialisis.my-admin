import { useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  Mail,
  MessageCircle,
  Monitor,
  Save,
  Search,
  Send,
  Smartphone,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  saveSalesProspect,
  sendProspectEmail,
  uploadOutreachImage,
  type SalesProspectRow,
} from "@/core/functions/sales-functions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { defineCopy, useCopy } from "@/lib/i18n"
import { SALES_STAGES } from "@/lib/sales"
import { cn } from "@/lib/utils"

type Stage = (typeof SALES_STAGES)[number]
type EmailLang = "ms" | "en"
type QueueFilter = "lead" | "contacted" | "all"
type ViewMode = "edit" | "preview" | "split"
type PreviewDevice = "desktop" | "mobile"
type SequenceStep = 0 | 1 | 2 | 3

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
    searchPlaceholder: "Search organisation, contact, email...",
    filterLead: "To contact",
    filterContacted: "Contacted",
    filterAll: "All",
    noEmail: "No email",
    branches: (n: number) => `${n} ${n === 1 ? "branch" : "branches"}`,
    sentStep: (step: number) => `Sent #${step}`,
    unsent: "Draft",
    emptyQueue: "No prospects match your filter.",
    selectPrompt: "Select a prospect on the left to compose and preview their outreach email.",
    whatsapp: "WhatsApp",
    stageLabel: "Stage",
    steps: {
      0: "Initial Email",
      1: "Follow-up #1 (+3d)",
      2: "Follow-up #2 (2 Ideas)",
      3: "Follow-up #3",
    } as Record<SequenceStep, string>,
    modeEdit: "Edit",
    modePreview: "Preview",
    modeSplit: "Split",
    fromLabel: "From",
    toLabel: "To",
    toPlaceholder: "pic@centre.com.my",
    subjectLabel: "Subject",
    subjectPlaceholder: "Quick question about your listing on dialisis.my",
    bodyLabel: "Email body",
    bodyPlaceholder: "Write a short, conversational cold email...",
    wordsGood: (n: number) => `~${n} words · short & conversational`,
    wordsMedium: (n: number) => `~${n} words · aim under 100 for cold email`,
    wordsLong: (n: number) => `~${n} words · trim for higher reply rate`,
    imageSection: "Personalized image",
    uploadImage: "Upload image",
    uploading: "Uploading...",
    imageUrlPlaceholder: "Or paste hosted image URL (https://...)",
    imageCaptionPlaceholder: "Optional caption under image",
    removeImage: "Remove image",
    imageUploaded: "Image uploaded",
    imageUploadFailed: "Failed to upload image",
    previewTitle: "Live email preview",
    desktop: "Desktop",
    mobile: "Mobile",
    previewTo: (email: string) => `to ${email}`,
    noSubject: "(No subject yet)",
    noBody: "Start writing on the left to preview your email.",
    signatureLine: (name: string, email: string) => `${name} · Co-founder, dialisis.my · ${email}`,
    saveDraft: "Save Draft",
    saving: "Saving...",
    draftSaved: "Draft saved",
    saveFailed: "Failed to save draft",
    copyRich: "Copy Rich Email",
    copied: "Copied to clipboard",
    copyFailed: "Failed to copy email",
    openZoho: "Open in Zoho Mail",
    sendZoho: "Send via Zoho",
    sending: "Sending...",
    markSent: "Mark as Sent (+3d FU)",
    markingSent: "Updating...",
    zohoHint: "Add Zoho OAuth secrets to enable 1-click direct send from luqman@dialisis.my.",
    sentZohoSuccess: "Email sent via Zoho Mail",
    markedSentSuccess: "Marked as sent — follow-up scheduled in 3 days",
    sendFailed: "Failed to send email",
    missingRecipient: "Add a recipient email address first",
    missingContent: "Add both a subject and message body first",
    stageUpdated: "Stage updated",
    whatsappDraft: "WhatsApp draft",
    whatsappPlaceholder: "Write a short BM WhatsApp message...",
    copyWhatsapp: "Copy WhatsApp",
    openWhatsapp: "Open in WhatsApp",
    sourceLabel: (src: string) => `Source: ${src}`,
    whatsappFirstBadge: "WA First",
    emailFirstBadge: "Email First",
    notesLabel: "Prospect notes",
    notesPlaceholder: "Research notes, alternate contacts, call takeaways...",
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
    searchPlaceholder: "Cari organisasi, kenalan, emel...",
    filterLead: "Belum dihubungi",
    filterContacted: "Dihubungi",
    filterAll: "Semua",
    noEmail: "Tiada emel",
    branches: (n: number) => `${n} cawangan`,
    sentStep: (step: number) => `Dihantar #${step}`,
    unsent: "Draf",
    emptyQueue: "Tiada prospek sepadan dengan tapisan.",
    selectPrompt: "Pilih prospek di sebelah kiri untuk mengarang dan melihat pratonton emel.",
    whatsapp: "WhatsApp",
    stageLabel: "Peringkat",
    steps: {
      0: "Emel Awal",
      1: "Susulan #1 (+3h)",
      2: "Susulan #2 (2 Idea)",
      3: "Susulan #3",
    },
    modeEdit: "Sunting",
    modePreview: "Pratonton",
    modeSplit: "Belah",
    fromLabel: "Daripada",
    toLabel: "Kepada",
    toPlaceholder: "pic@pusat.com.my",
    subjectLabel: "Subjek",
    subjectPlaceholder: "Soalan ringkas tentang penyenaraian anda di dialisis.my",
    bodyLabel: "Kandungan emel",
    bodyPlaceholder: "Tulis emel ringkas dan mesra...",
    wordsGood: (n: number) => `~${n} patah perkataan · ringkas & santai`,
    wordsMedium: (n: number) => `~${n} patah perkataan · sasarkan bawah 100`,
    wordsLong: (n: number) => `~${n} patah perkataan · pendekkan untuk balasan lebih tinggi`,
    imageSection: "Gambar diperibadikan",
    uploadImage: "Muat naik gambar",
    uploading: "Memuat naik...",
    imageUrlPlaceholder: "Atau tampal URL gambar (https://...)",
    imageCaptionPlaceholder: "Kapsyen pilihan di bawah gambar",
    removeImage: "Buang gambar",
    imageUploaded: "Gambar dimuat naik",
    imageUploadFailed: "Gagal memuat naik gambar",
    previewTitle: "Pratonton emel langsung",
    desktop: "Desktop",
    mobile: "Telefon",
    previewTo: (email: string) => `kepada ${email}`,
    noSubject: "(Tiada subjek lagi)",
    noBody: "Mula menulis di sebelah kiri untuk melihat pratonton emel.",
    signatureLine: (name: string, email: string) => `${name} · Pengasas bersama, dialisis.my · ${email}`,
    saveDraft: "Simpan Draf",
    saving: "Menyimpan...",
    draftSaved: "Draf disimpan",
    saveFailed: "Gagal menyimpan draf",
    copyRich: "Salin Emel",
    copied: "Disalin ke papan klip",
    copyFailed: "Gagal menyalin emel",
    openZoho: "Buka di Zoho Mail",
    sendZoho: "Hantar melalui Zoho",
    sending: "Menghantar...",
    markSent: "Tanda Dihantar (+3h FU)",
    markingSent: "Mengemas kini...",
    zohoHint: "Tambah rahsia OAuth Zoho untuk menghantar terus 1-klik dari luqman@dialisis.my.",
    sentZohoSuccess: "Emel dihantar melalui Zoho Mail",
    markedSentSuccess: "Ditanda dihantar — susulan dijadualkan 3 hari lagi",
    sendFailed: "Gagal menghantar emel",
    missingRecipient: "Masukkan alamat emel penerima dahulu",
    missingContent: "Masukkan subjek dan kandungan emel dahulu",
    stageUpdated: "Peringkat dikemas kini",
    whatsappDraft: "Draf WhatsApp",
    whatsappPlaceholder: "Tulis mesej WhatsApp ringkas dalam BM...",
    copyWhatsapp: "Salin WhatsApp",
    openWhatsapp: "Buka di WhatsApp",
    sourceLabel: (src: string) => `Sumber: ${src}`,
    whatsappFirstBadge: "WA Dulu",
    emailFirstBadge: "Emel Dulu",
    notesLabel: "Catatan prospek",
    notesPlaceholder: "Nota kajian, nombor alternatif, ringkasan panggilan...",
  },
})

const MAX_IMAGE_DIM = 1200

async function resizeOutreachImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_DIM / bitmap.width, MAX_IMAGE_DIM / bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const isPng = file.type === "image/png"
  const mime = isPng ? "image/png" : "image/jpeg"
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, isPng ? undefined : 0.85)
  )
  if (!blob) throw new Error("Could not process image")
  return new File([blob], isPng ? "outreach.png" : "outreach.jpg", { type: mime })
}

function toMalaysiaWhatsAppUrl(phone: string | null, text?: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  if (!digits) return null
  const normalized = digits.startsWith("0")
    ? `60${digits.slice(1)}`
    : digits.startsWith("60")
      ? digits
      : null
  if (!normalized || !normalized.startsWith("601") || normalized.length < 10) return null
  const trimmed = text?.trim()
  return trimmed
    ? `https://wa.me/${normalized}?text=${encodeURIComponent(trimmed)}`
    : `https://wa.me/${normalized}`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "UL"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildFollowUpTemplate(
  step: 1 | 2 | 3,
  lang: EmailLang,
  prospect: SalesProspectRow
): { subject: string; body: string } {
  const firstName = prospect.contactName?.trim().split(/\s+/)[0] || ""
  const org = prospect.organization
  const greetingEn = firstName ? `Hi ${firstName},` : "Hi team,"
  const greetingMs = firstName ? `Salam ${firstName},` : "Salam sejahtera,"

  if (lang === "ms") {
    if (step === 1) {
      return {
        subject: `Susulan ringkas: penyenaraian ${org} di dialisis.my`,
        body: `${greetingMs}\n\nSekadar ingin susulan emel saya beberapa hari lepas tentang halaman ${org} di dialisis.my.\n\nKami boleh aktifkan akses admin percuma supaya pasukan anda boleh semak maklumat pusat dan terima pertanyaan keluarga terus ke WhatsApp.\n\nBoleh saya hantar pautan akses untuk anda lihat?`,
      }
    }
    if (step === 2) {
      return {
        subject: `2 idea ringkas untuk halaman ${org} di dialisis.my`,
        body: `${greetingMs}\n\nSaya sempat semak penyenaraian ${org} di dialisis.my dan ada 2 cadangan ringkas:\n\n1. Paparkan panel pembiayaan (PERKESO, JPA, zakat) serta waktu operasi terkini supaya keluarga terus tahu sebelum menghubungi.\n2. Sambungkan butang pertanyaan terus ke PIC cawangan supaya maklum balas lebih pantas.\n\nKalau berminat, saya boleh bantu kemas kini dalam 5 minit minggu ini — sesuai tak?`,
      }
    }
    return {
      subject: `Tutup pusingan: ${org} di dialisis.my`,
      body: `${greetingMs}\n\nSaya andaikan masa belum sesuai buat masa ini, jadi saya tidak akan mengganggu lagi.\n\nJika pasukan ${org} mahu tuntut dan kemas kini penyenaraian percuma di dialisis.my pada bila-bila masa, balas sahaja emel ini.\n\nSemoga urusan pasukan dipermudahkan.`,
    }
  }

  if (step === 1) {
    return {
      subject: `Quick follow-up: ${org} on dialisis.my`,
      body: `${greetingEn}\n\nJust bubbling this up in case it got buried — happy to set up free admin access for ${org} on dialisis.my so your team can keep details accurate and receive family enquiries directly.\n\nWould you like me to send over the claim link?`,
    }
  }
  if (step === 2) {
    return {
      subject: `2 quick ideas for ${org}'s dialisis.my page`,
      body: `${greetingEn}\n\nTook a quick look at ${org}'s listing on dialisis.my and spotted 2 simple wins:\n\n1. Highlight accepted panels (PERKESO, JPA, zakat) and current shift hours so families know they qualify before reaching out.\n2. Route enquiries straight to your branch PIC for faster response.\n\nOpen to a quick 5-minute walkthrough this week?`,
    }
  }
  return {
    subject: `Closing the loop on ${org}`,
    body: `${greetingEn}\n\nLooks like now isn't the right time, so I won't crowd your inbox.\n\nWhenever ${org} wants to claim and update your free listing on dialisis.my, just reply here and I'll set it up.\n\nWishing your team a smooth week ahead.`,
  }
}

type DraftContent = { subject: string; body: string }

function buildRichEmailHtml({
  body,
  imageUrl,
  imageCaption,
  signature,
}: {
  body: string
  imageUrl: string
  imageCaption: string
  signature: string
}) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 12px 0;line-height:1.6;">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`
    )
    .join("")

  const imageBlock = imageUrl.trim()
    ? `<div style="margin:16px 0;"><img src="${escapeHtml(imageUrl.trim())}" alt="${escapeHtml(imageCaption.trim() || "Outreach preview")}" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb;display:block;" />${
        imageCaption.trim()
          ? `<p style="margin:6px 0 0 0;font-size:12px;color:#6b7280;">${escapeHtml(imageCaption.trim())}</p>`
          : ""
      }</div>`
    : ""

  const signatureBlock = `<p style="margin:18px 0 0 0;padding-top:12px;border-top:1px solid #e5e7eb;font-size:13px;color:#4b5563;">${escapeHtml(signature)}</p>`

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#111827;">${paragraphs}${imageBlock}${signatureBlock}</div>`
}

export function ColdEmailStudio({
  prospects,
  selectedId,
  onSelectId,
  zohoConfigured,
  fromEmail,
  fromName,
}: {
  prospects: SalesProspectRow[]
  selectedId: string | null
  onSelectId: (id: string) => void
  zohoConfigured: boolean
  fromEmail: string
  fromName: string
}) {
  const t = useCopy(COPY)
  const [search, setSearch] = useState("")
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("lead")

  const leadCount = prospects.filter((p) => p.stage === "lead").length
  const contactedCount = prospects.filter((p) => p.stage !== "lead").length

  const filteredProspects = prospects.filter((p) => {
    if (queueFilter === "lead" && p.stage !== "lead") return false
    if (queueFilter === "contacted" && p.stage === "lead") return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [p.organization, p.contactName, p.email, p.notes]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(q))
  })

  const selected =
    prospects.find((p) => p.id === selectedId) ?? filteredProspects[0] ?? prospects[0] ?? null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="flex flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-3 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-9 pl-8 text-sm"
            />
          </div>

          <div className="flex gap-1.5" role="group">
            {(
              [
                { value: "lead", label: t.filterLead, count: leadCount },
                { value: "contacted", label: t.filterContacted, count: contactedCount },
                { value: "all", label: t.filterAll, count: prospects.length },
              ] as const
            ).map((pill) => (
              <Button
                key={pill.value}
                type="button"
                size="sm"
                variant={queueFilter === pill.value ? "default" : "outline"}
                aria-pressed={queueFilter === pill.value}
                className="h-7 flex-1 rounded-full px-2 text-xs"
                onClick={() => setQueueFilter(pill.value)}
              >
                <span className="truncate">{pill.label}</span>
                <span className="font-mono tabular-nums opacity-75">{pill.count}</span>
              </Button>
            ))}
          </div>

          <div className="max-h-[360px] flex-1 space-y-1.5 overflow-y-auto pr-0.5 lg:max-h-none lg:overflow-y-visible">
            {filteredProspects.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                {t.emptyQueue}
              </p>
            ) : (
              filteredProspects.map((prospect) => {
                const isSelected = selected?.id === prospect.id
                return (
                  <button
                    key={prospect.id}
                    type="button"
                    onClick={() => onSelectId(prospect.id)}
                    className={cn(
                      "w-full rounded-xl border p-2.5 text-left transition-colors hover:bg-muted/50",
                      isSelected
                        ? "border-primary bg-muted/40 ring-2 ring-primary/50"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {prospect.organization}
                      </p>
                      {prospect.emailStep > 0 ? (
                        <Badge
                          variant="secondary"
                          className="shrink-0 font-mono text-[10px] tabular-nums"
                        >
                          {t.sentStep(prospect.emailStep)}
                        </Badge>
                      ) : (
                        <span className="shrink-0 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {t.unsent}
                        </span>
                      )}
                    </div>

                    {prospect.contactName && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {prospect.contactName}
                      </p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {prospect.sendWave && (
                        <span className="shrink-0 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {prospect.sendWave.replace(/\s*\(.*\)/, "")}
                        </span>
                      )}
                      {prospect.primaryChannel && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                            prospect.primaryChannel.startsWith("WhatsApp")
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border-border bg-background text-muted-foreground"
                          )}
                        >
                          {prospect.primaryChannel.startsWith("WhatsApp")
                            ? t.whatsappFirstBadge
                            : t.emailFirstBadge}
                        </span>
                      )}
                      {prospect.email ? (
                        <span className="max-w-full truncate text-xs text-muted-foreground">
                          {prospect.email}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                          {t.noEmail}
                        </span>
                      )}
                      {prospect.centers.length > 0 && (
                        <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                          {t.branches(prospect.centers.length)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <ComposerWorkspace
          key={selected.id}
          prospect={selected}
          zohoConfigured={zohoConfigured}
          fromEmail={fromEmail}
          fromName={fromName}
        />
      ) : (
        <Card className="flex min-h-[420px] items-center justify-center">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <Mail className="mx-auto mb-2 size-6 opacity-50" />
            {t.selectPrompt}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ComposerWorkspace({
  prospect,
  zohoConfigured,
  fromEmail,
  fromName,
}: {
  prospect: SalesProspectRow
  zohoConfigured: boolean
  fromEmail: string
  fromName: string
}) {
  const t = useCopy(COPY)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [lang, setLang] = useState<EmailLang>(() => (prospect.emailLang === "en" ? "en" : "ms"))
  const [to, setTo] = useState(() => prospect.email ?? "")
  const [activeStep, setActiveStep] = useState<SequenceStep>(0)
  const [viewMode, setViewMode] = useState<ViewMode>("split")
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop")
  const [imageUrl, setImageUrl] = useState(() => prospect.emailImageUrl ?? "")
  const [imageCaption, setImageCaption] = useState(() => prospect.emailImageCaption ?? "")
  const [whatsappBody, setWhatsappBody] = useState(() => prospect.whatsappBody ?? "")
  const [notes, setNotes] = useState(() => prospect.notes ?? "")
  const [copied, setCopied] = useState(false)
  const [copiedWa, setCopiedWa] = useState(false)

  const [drafts, setDrafts] = useState<Record<EmailLang, Partial<Record<SequenceStep, DraftContent>>>>(
    () => ({
      en: {
        0: {
          subject: prospect.emailSubject ?? "",
          body: prospect.emailBody ?? "",
        },
      },
      ms: {
        0: {
          subject: prospect.emailSubjectBm ?? "",
          body: prospect.emailBodyBm ?? "",
        },
      },
    })
  )

  const currentDraft: DraftContent =
    drafts[lang][activeStep] ??
    (activeStep === 0
      ? { subject: "", body: "" }
      : buildFollowUpTemplate(activeStep, lang, prospect))

  const updateCurrentDraft = (patch: Partial<DraftContent>) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [activeStep]: {
          ...currentDraft,
          ...patch,
        },
      },
    }))
  }

  const selectStep = (step: SequenceStep) => {
    setActiveStep(step)
    if (step !== 0 && !drafts[lang][step]) {
      const tpl = buildFollowUpTemplate(step, lang, prospect)
      setDrafts((prev) => ({
        ...prev,
        [lang]: {
          ...prev[lang],
          [step]: tpl,
        },
      }))
    }
  }

  const stageMutation = useMutation({
    mutationFn: (stage: Stage) =>
      saveSalesProspect({
        data: {
          id: prospect.id,
          organization: prospect.organization,
          dialysisCenterIds: prospect.centers.map((c) => c.id),
          contactName: prospect.contactName,
          phone: prospect.phone,
          email: to.trim() || null,
          stage,
          lostReason: prospect.lostReason,
          notes: notes.trim() || null,
          nextFollowUpAt: prospect.nextFollowUpAt,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesProspects"] })
      toast.success(t.stageUpdated)
    },
    onError: (err) => toast.error(err.message || t.saveFailed),
  })

  const saveDraftMutation = useMutation({
    mutationFn: () => {
      const enSubject =
        lang === "en" ? currentDraft.subject : (drafts.en[0]?.subject ?? prospect.emailSubject)
      const enBody = lang === "en" ? currentDraft.body : (drafts.en[0]?.body ?? prospect.emailBody)
      const msSubject =
        lang === "ms" ? currentDraft.subject : (drafts.ms[0]?.subject ?? prospect.emailSubjectBm)
      const msBody =
        lang === "ms" ? currentDraft.body : (drafts.ms[0]?.body ?? prospect.emailBodyBm)

      return saveSalesProspect({
        data: {
          id: prospect.id,
          organization: prospect.organization,
          dialysisCenterIds: prospect.centers.map((c) => c.id),
          contactName: prospect.contactName,
          phone: prospect.phone,
          email: to.trim() || null,
          stage: prospect.stage,
          lostReason: prospect.lostReason,
          notes: notes.trim() || null,
          nextFollowUpAt: prospect.nextFollowUpAt,
          emailSubject: enSubject || null,
          emailBody: enBody || null,
          emailSubjectBm: msSubject || null,
          emailBodyBm: msBody || null,
          emailLang: lang,
          emailImageUrl: imageUrl.trim() || null,
          emailImageCaption: imageCaption.trim() || null,
          whatsappBody: whatsappBody.trim() || null,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesProspects"] })
      toast.success(t.draftSaved)
    },
    onError: (err) => toast.error(err.message || t.saveFailed),
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const resized = await resizeOutreachImage(file)
      const formData = new FormData()
      formData.append("prospectId", prospect.id)
      formData.append("file", resized)
      return uploadOutreachImage({ data: formData })
    },
    onSuccess: ({ url }) => {
      setImageUrl(url)
      toast.success(t.imageUploaded)
    },
    onError: (err) => toast.error(err.message || t.imageUploadFailed),
  })

  const sendMutation = useMutation({
    mutationFn: (mode: "zoho" | "mark_sent") =>
      sendProspectEmail({
        data: {
          prospectId: prospect.id,
          to: to.trim(),
          subject: currentDraft.subject.trim(),
          body: currentDraft.body.trim(),
          lang,
          imageUrl: imageUrl.trim() || null,
          imageCaption: imageCaption.trim() || null,
          mode,
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["salesProspects"] })
      toast.success(res.mode === "zoho" ? t.sentZohoSuccess : t.markedSentSuccess)
    },
    onError: (err) => toast.error(err.message || t.sendFailed),
  })

  const handleSend = () => {
    if (!to.trim()) {
      toast.error(t.missingRecipient)
      return
    }
    if (!currentDraft.subject.trim() || !currentDraft.body.trim()) {
      toast.error(t.missingContent)
      return
    }
    sendMutation.mutate(zohoConfigured ? "zoho" : "mark_sent")
  }

  const signature = t.signatureLine(fromName, fromEmail)

  const handleCopyRich = async () => {
    const plain = [
      currentDraft.body.trim(),
      imageUrl.trim() ? `[Image: ${imageUrl.trim()}]` : "",
      imageCaption.trim(),
      "--",
      signature,
    ]
      .filter(Boolean)
      .join("\n\n")

    const html = buildRichEmailHtml({
      body: currentDraft.body,
      imageUrl,
      imageCaption,
      signature,
    })

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(plain)
      }
      setCopied(true)
      toast.success(t.copied)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      try {
        await navigator.clipboard.writeText(plain)
        setCopied(true)
        toast.success(t.copied)
        window.setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error(t.copyFailed)
      }
    }
  }

  const zohoComposeUrl = (() => {
    const params = new URLSearchParams()
    if (to.trim()) params.set("to", to.trim())
    if (currentDraft.subject.trim()) params.set("subject", currentDraft.subject.trim())
    if (currentDraft.body.trim()) {
      params.set("body", `${currentDraft.body.trim()}\n\n${signature}`)
    }
    return `https://mail.zoho.com/zm/#compose?${params.toString()}`
  })()

  const whatsappUrl = toMalaysiaWhatsAppUrl(prospect.phone, whatsappBody)

  const handleCopyWhatsapp = async () => {
    const text = whatsappBody.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedWa(true)
      toast.success(t.copied)
      window.setTimeout(() => setCopiedWa(false), 2000)
    } catch {
      toast.error(t.copyFailed)
    }
  }
  const wordCount = countWords(currentDraft.body)
  const wordHint =
    wordCount <= 100
      ? { text: t.wordsGood(wordCount), tone: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" }
      : wordCount <= 160
        ? { text: t.wordsMedium(wordCount), tone: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/25" }
        : { text: t.wordsLong(wordCount), tone: "text-destructive bg-destructive/10 border-destructive/25" }

  const showEditor = viewMode === "edit" || viewMode === "split"
  const showPreview = viewMode === "preview" || viewMode === "split"

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-foreground">
              {prospect.organization}
            </h2>
            {prospect.centers.length > 0 && (
              <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
                {t.branches(prospect.centers.length)}
              </Badge>
            )}
            {prospect.sendWave && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {prospect.sendWave}
              </Badge>
            )}
            {prospect.primaryChannel && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px]",
                  prospect.primaryChannel.startsWith("WhatsApp")
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground"
                )}
              >
                {prospect.primaryChannel}
              </Badge>
            )}
          </div>
          {prospect.contactName && (
            <p className="truncate text-xs text-muted-foreground">{prospect.contactName}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={prospect.stage}
            disabled={stageMutation.isPending}
            onValueChange={(value) => stageMutation.mutate(value as Stage)}
          >
            <SelectTrigger aria-label={t.stageLabel} className="data-[size=default]:h-8 w-36 text-xs">
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

          {whatsappUrl && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle className="size-3.5" />
                {t.whatsapp}
              </a>
            </Button>
          )}

          <div
            role="group"
            aria-label="Email language"
            className="inline-flex rounded-full border bg-background p-0.5"
          >
            {(["ms", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium uppercase transition-colors",
                  lang === code
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {code === "ms" ? "BM" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {([0, 1, 2, 3] as const).map((step) => (
            <Button
              key={step}
              type="button"
              size="sm"
              variant={activeStep === step ? "default" : "outline"}
              aria-pressed={activeStep === step}
              className="h-7 rounded-full px-2.5 text-xs"
              onClick={() => selectStep(step)}
            >
              {step > 0 && <Sparkles className="size-3" />}
              {t.steps[step]}
            </Button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Workspace mode"
          className="inline-flex rounded-full border bg-muted/40 p-0.5"
        >
          {(
            [
              { value: "edit", label: t.modeEdit },
              { value: "preview", label: t.modePreview },
              { value: "split", label: t.modeSplit },
            ] as const
          ).map((mode) => (
            <button
              key={mode.value}
              type="button"
              aria-pressed={viewMode === mode.value}
              onClick={() => setViewMode(mode.value)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                viewMode === mode.value
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <CardContent
        className={cn(
          "grid flex-1 gap-4 p-4",
          viewMode === "split" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
        )}
      >
        {showEditor && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-xs">
              <span className="font-medium text-muted-foreground">{t.fromLabel}:</span>
              <span className="font-mono text-foreground">
                {fromName} &lt;{fromEmail}&gt;
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="cold-email-to" className="text-xs font-medium text-muted-foreground">
                  {t.toLabel}
                </label>
                {prospect.emailSource && (
                  <span className="text-[11px] text-muted-foreground">
                    {t.sourceLabel(prospect.emailSource)}
                  </span>
                )}
              </div>
              <Input
                id="cold-email-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder={t.toPlaceholder}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="cold-email-subject"
                className="text-xs font-medium text-muted-foreground"
              >
                {t.subjectLabel}
              </label>
              <Input
                id="cold-email-subject"
                value={currentDraft.subject}
                onChange={(e) => updateCurrentDraft({ subject: e.target.value })}
                placeholder={t.subjectPlaceholder}
                className="h-9 text-sm font-medium"
              />
            </div>

            <div className="flex flex-1 flex-col space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="cold-email-body"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t.bodyLabel}
                </label>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] tabular-nums",
                    wordHint.tone
                  )}
                >
                  {wordHint.text}
                </span>
              </div>
              <Textarea
                id="cold-email-body"
                value={currentDraft.body}
                onChange={(e) => updateCurrentDraft({ body: e.target.value })}
                placeholder={t.bodyPlaceholder}
                className="min-h-[220px] flex-1 resize-y text-sm leading-relaxed"
              />
            </div>

            <div className="space-y-2.5 rounded-xl border bg-muted/25 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">{t.imageSection}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (file) uploadMutation.mutate(file)
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  disabled={uploadMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="size-3.5" />
                  {uploadMutation.isPending ? t.uploading : t.uploadImage}
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t.imageUrlPlaceholder}
                  className="h-8 text-xs"
                />
                <Input
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder={t.imageCaptionPlaceholder}
                  className="h-8 text-xs"
                />
              </div>

              {imageUrl.trim() && (
                <div className="flex items-center gap-3 rounded-lg border bg-card p-2">
                  <img
                    src={imageUrl.trim()}
                    alt={imageCaption.trim() || "Preview"}
                    className="h-14 w-20 rounded-md border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-muted-foreground">{imageUrl.trim()}</p>
                    {imageCaption.trim() && (
                      <p className="truncate text-xs text-foreground">{imageCaption.trim()}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 text-destructive hover:text-destructive"
                    aria-label={t.removeImage}
                    onClick={() => {
                      setImageUrl("")
                      setImageCaption("")
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border bg-muted/25 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <MessageCircle className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    {t.whatsappDraft}
                  </span>
                  {prospect.phone && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {prospect.phone}
                    </span>
                  )}
                </div>
                {prospect.whatsappSource && (
                  <span className="text-[11px] text-muted-foreground">
                    {t.sourceLabel(prospect.whatsappSource)}
                  </span>
                )}
              </div>
              <Textarea
                value={whatsappBody}
                onChange={(e) => setWhatsappBody(e.target.value)}
                placeholder={t.whatsappPlaceholder}
                rows={4}
                className="resize-y bg-background text-sm leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  disabled={!whatsappBody.trim()}
                  onClick={handleCopyWhatsapp}
                >
                  {copiedWa ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {t.copyWhatsapp}
                </Button>
                {whatsappUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="h-8 gap-1.5 text-xs"
                    asChild
                  >
                    <a href={whatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-3.5" />
                      {t.openWhatsapp}
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border bg-muted/25 p-3">
              <label
                htmlFor="cold-email-notes"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground"
              >
                <StickyNote className="size-3.5 text-muted-foreground" />
                {t.notesLabel}
              </label>
              <Textarea
                id="cold-email-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                rows={4}
                className="resize-y bg-background text-xs leading-relaxed"
              />
            </div>
          </div>
        )}

        {showPreview && (
          <div className="flex flex-col gap-2.5 rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">{t.previewTitle}</span>
              <div className="inline-flex rounded-full border bg-background p-0.5">
                <button
                  type="button"
                  aria-pressed={previewDevice === "desktop"}
                  onClick={() => setPreviewDevice("desktop")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                    previewDevice === "desktop"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Monitor className="size-3" />
                  {t.desktop}
                </button>
                <button
                  type="button"
                  aria-pressed={previewDevice === "mobile"}
                  onClick={() => setPreviewDevice("mobile")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                    previewDevice === "mobile"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Smartphone className="size-3" />
                  {t.mobile}
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-start justify-center overflow-x-auto py-1">
              <div
                className={cn(
                  "w-full overflow-hidden rounded-xl border bg-card shadow-sm transition-all",
                  previewDevice === "mobile" ? "max-w-[375px]" : "max-w-full"
                )}
              >
                <div className="flex items-center gap-3 border-b bg-muted/20 px-4 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {getInitials(fromName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {fromName}{" "}
                      <span className="font-mono text-xs font-normal text-muted-foreground">
                        &lt;{fromEmail}&gt;
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.previewTo(to.trim() || "recipient@example.com")}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <h3 className="text-base font-semibold leading-snug text-foreground">
                    {currentDraft.subject.trim() || (
                      <span className="font-normal text-muted-foreground">{t.noSubject}</span>
                    )}
                  </h3>

                  {currentDraft.body.trim() ? (
                    <div className="space-y-3 text-sm leading-relaxed text-foreground">
                      {currentDraft.body
                        .split(/\n{2,}/)
                        .map((block) => block.trim())
                        .filter(Boolean)
                        .map((block, index) => (
                          <p key={index} className="whitespace-pre-line">
                            {block}
                          </p>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">{t.noBody}</p>
                  )}

                  {imageUrl.trim() && (
                    <figure className="space-y-1.5">
                      <img
                        src={imageUrl.trim()}
                        alt={imageCaption.trim() || "Email attachment preview"}
                        className="max-h-72 w-full rounded-lg border bg-muted/20 object-contain"
                      />
                      {imageCaption.trim() && (
                        <figcaption className="text-xs text-muted-foreground">
                          {imageCaption.trim()}
                        </figcaption>
                      )}
                    </figure>
                  )}

                  <div className="border-t pt-3 text-xs text-muted-foreground">{signature}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={saveDraftMutation.isPending}
            onClick={() => saveDraftMutation.mutate()}
          >
            <Save className="size-4" />
            {saveDraftMutation.isPending ? t.saving : t.saveDraft}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleCopyRich}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {t.copyRich}
          </Button>

          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" asChild>
            <a href={zohoComposeUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              {t.openZoho}
            </a>
          </Button>
        </div>

        {zohoConfigured ? (
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5"
            disabled={sendMutation.isPending}
            onClick={handleSend}
          >
            <Send className="size-4" />
            {sendMutation.isPending ? t.sending : t.sendZoho}
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={sendMutation.isPending}
                  onClick={handleSend}
                >
                  <Send className="size-4" />
                  {sendMutation.isPending ? t.markingSent : t.markSent}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{t.zohoHint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </Card>
  )
}
