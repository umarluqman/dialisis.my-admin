import { useState } from "react"
import { AlertCircle, Check, Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { IntakeLeadListItem } from "@/components/intake-lead-list"
import { defineCopy, useCopy } from "@/lib/i18n"

export type LeadOutreach = {
  accessToken: string
  centerEmail: string | null
  centerPhoneNumber: string
}

const COPY = defineCopy({
  en: {
    title: "Forward manually",
    linkExpired: "The lead link has expired. The center won't be able to open it.",
    centerWhatsapp: "Center – WhatsApp",
    centerEmailSubject: "Center – Email subject",
    centerEmailBody: "Center – Email body",
    patientWhatsapp: "Patient – WhatsApp",
    copy: "Copy",
    copied: "Copied",
    openWhatsapp: "Open WhatsApp",
    openEmail: "Open email",
  },
  ms: {
    title: "Hantar secara manual",
    linkExpired: "Pautan permohonan telah tamat tempoh. Pusat tidak dapat membukanya.",
    centerWhatsapp: "Pusat – WhatsApp",
    centerEmailSubject: "Pusat – Subjek e-mel",
    centerEmailBody: "Pusat – Isi e-mel",
    patientWhatsapp: "Pesakit – WhatsApp",
    copy: "Salin",
    copied: "Disalin",
    openWhatsapp: "Buka WhatsApp",
    openEmail: "Buka e-mel",
  },
})

const msDateFormatter = new Intl.DateTimeFormat("ms-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  day: "numeric",
  month: "long",
  year: "numeric",
})

function whatsappUrl(phone: string, text: string) {
  const digits = phone.split(/[,;/\n]/)[0].replace(/\D/g, "")
  if (!digits) return undefined
  const number = digits.startsWith("0") ? `6${digits}` : digits
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

export function LeadOutreachDrafts({
  lead,
  outreach,
}: {
  lead: IntakeLeadListItem
  outreach: LeadOutreach
}) {
  const t = useCopy(COPY)
  const link = `https://dialisis.my/intake-leads/${outreach.accessToken}`
  const expired = new Date(lead.accessExpiresAt).getTime() < Date.now()
  const date = msDateFormatter.format(new Date(lead.preferredDate))
  const session = lead.preferredSession.toLowerCase()
  const center = lead.centerName

  const centerWhatsapp = `Assalamualaikum / Salam sejahtera. Saya Umar dari Dialisis.my, direktori pusat dialisis di Malaysia.

Kami terima permohonan daripada pesakit baharu yang ingin mendapatkan rawatan di ${center}, sesi pilihan ${session}, mulai ${date}.

Butiran penuh pesakit (termasuk keputusan makmal, jika ada) boleh dilihat di pautan ini:
${link}

Pautan aktif 7 hari. Tiada sebarang caj, kami cuma ingin bantu pesakit dapat tempat. Mohon pihak tuan/puan hubungi pesakit terus. Di halaman itu juga ada butang untuk kemas kini status (dihubungi / temujanji disahkan).

Terima kasih 🙏`

  const emailSubject = `Permohonan pesakit baharu untuk ${center}, melalui Dialisis.my`

  const emailBody = `Assalamualaikum / Salam sejahtera tuan/puan,

Saya Umar dari Dialisis.my, direktori pusat dialisis di Malaysia (https://dialisis.my).

Kami telah menerima permohonan daripada seorang pesakit baharu yang ingin mendapatkan rawatan dialisis di ${center}:

- Sesi pilihan: ${session}
- Tarikh mula pilihan: ${date}

Butiran penuh pesakit (nama, nombor telefon, alamat dan keputusan makmal, jika ada) boleh dilihat di pautan selamat berikut:
${link}

Pautan ini aktif selama 7 hari sahaja. Di halaman yang sama, tuan/puan boleh menghubungi pesakit terus melalui panggilan atau WhatsApp, dan mengemas kini status susulan.

Perkhidmatan ini percuma, tiada sebarang caj. Kami hanya ingin membantu pesakit mendapatkan tempat rawatan secepat mungkin.

Jika ada sebarang pertanyaan, sila balas e-mel ini. Saya juga ingin mengemas kini nombor WhatsApp pusat tuan/puan di Dialisis.my supaya pesakit lebih mudah menghubungi pihak tuan/puan. Mohon kongsikan jika ada.

Terima kasih.

Salam hormat,
Umar Luqman
Dialisis.my`

  const patientWhatsapp = `Assalamualaikum / Salam sejahtera ${lead.fullName}. Ini Umar dari Dialisis.my.

Permohonan anda telah kami hantar kepada ${center}. Pihak pusat akan menghubungi anda terus untuk sahkan slot dan dokumen yang diperlukan.

Jika tiada sebarang maklum balas dalam 2 hari bekerja, sila maklumkan kepada kami dan kami akan bantu susul.`

  return (
    <section className="mt-4 space-y-3 border-t pt-4">
      <h3 className="font-medium">{t.title}</h3>
      {expired && (
        <p className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {t.linkExpired}
        </p>
      )}
      <Draft
        label={t.centerWhatsapp}
        text={centerWhatsapp}
        href={whatsappUrl(outreach.centerPhoneNumber, centerWhatsapp)}
        hrefLabel={t.openWhatsapp}
      />
      <Draft label={t.centerEmailSubject} text={emailSubject} />
      <Draft
        label={t.centerEmailBody}
        text={emailBody}
        href={
          outreach.centerEmail
            ? `mailto:${outreach.centerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
            : undefined
        }
        hrefLabel={t.openEmail}
      />
      <Draft
        label={t.patientWhatsapp}
        text={patientWhatsapp}
        href={whatsappUrl(lead.phoneNumber, patientWhatsapp)}
        hrefLabel={t.openWhatsapp}
      />
    </section>
  )
}

function Draft({
  label,
  text,
  href,
  hrefLabel,
}: {
  label: string
  text: string
  href?: string
  hrefLabel?: string
}) {
  const t = useCopy(COPY)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="ml-auto flex gap-2">
          {href && (
            <Button asChild size="sm" variant="ghost">
              <a href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer">
                {hrefLabel}
                <ExternalLink />
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
            {copied ? t.copied : t.copy}
          </Button>
        </div>
      </div>
      <pre className="max-h-48 overflow-y-auto rounded-md border bg-background p-3 font-sans text-xs whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  )
}
