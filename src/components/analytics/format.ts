import type { ContactKind, SourceKey } from "@/lib/analytics"
import { dateFormats, defineCopy, INTL_LOCALE, type Locale } from "@/lib/i18n"

export const LABELS = defineCopy({
  en: {
    contact: {
      whatsapp: "WhatsApp",
      call: "Phone call",
      directions: "Directions",
    } satisfies Record<ContactKind, string>,
    source: {
      home: "Home page",
      map: "Centers map",
      center: "Center page",
      chain: "Chain page",
      location: "Location listing",
      other: "Other page",
    } satisfies Record<SourceKey, string>,
  },
  ms: {
    contact: {
      whatsapp: "WhatsApp",
      call: "Panggilan telefon",
      directions: "Arah",
    },
    source: {
      home: "Laman utama",
      map: "Peta pusat",
      center: "Halaman pusat",
      chain: "Halaman rangkaian",
      location: "Senarai lokasi",
      other: "Halaman lain",
    },
  },
})

const numberFormat = new Intl.NumberFormat("en-MY")

const dayFormat = dateFormats({
  timeZone: "UTC",
  day: "numeric",
  month: "short",
})

const longDayFormat = dateFormats({
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
})

export const CONTACT_COLORS: Record<ContactKind, string> = {
  whatsapp: "bg-series-1",
  call: "bg-series-2",
  directions: "bg-series-3",
}

const mytDateTimeOptions: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Kuala_Lumpur",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
}
const mytDateTimeFormat = new Intl.DateTimeFormat("en-US", mytDateTimeOptions)
const msMytDateTimeFormat = new Intl.DateTimeFormat(INTL_LOCALE.ms, mytDateTimeOptions)

export function formatMytDateTime(iso: string, locale: Locale) {
  if (locale === "ms") return msMytDateTimeFormat.format(new Date(iso))
  const part = Object.fromEntries(
    mytDateTimeFormat
      .formatToParts(new Date(iso))
      .map(({ type, value }) => [type, value])
  )
  return `${part.day} ${part.month} ${part.year}, ${part.hour}:${part.minute} ${part.dayPeriod}`
}

export function formatNumber(value: number) {
  return numberFormat.format(value)
}

export function formatDay(day: string, locale: Locale) {
  return dayFormat[locale].format(new Date(`${day}T00:00:00Z`))
}

export function formatLongDay(day: string, locale: Locale) {
  return longDayFormat[locale].format(new Date(`${day}T00:00:00Z`))
}

export function contactRate(contactVisitors: number, visitors: number) {
  return visitors > 0 ? contactVisitors / visitors : 0
}

export function formatRate(rate: number) {
  return `${(rate * 100).toFixed(1)}%`
}
