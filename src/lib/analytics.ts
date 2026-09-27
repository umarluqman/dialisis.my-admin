export const ANALYTICS_PRESETS = [7, 30, 90] as const
export type AnalyticsPreset = (typeof ANALYTICS_PRESETS)[number]
export const DEFAULT_PRESET: AnalyticsPreset = 30
export const MAX_RANGE_DAYS = 366

export const CONTACT_KINDS = ["whatsapp", "call", "directions"] as const
export type ContactKind = (typeof CONTACT_KINDS)[number]
export const CONTACT_LABELS: Record<ContactKind, string> = {
  whatsapp: "WhatsApp",
  call: "Phone call",
  directions: "Directions",
}

export const SOURCE_LABELS = {
  home: "Home page",
  map: "Centers map",
  center: "Center page",
  chain: "Chain page",
  location: "Location listing",
  other: "Other page",
} as const
export type SourceKey = keyof typeof SOURCE_LABELS
export const SOURCE_KEYS = Object.keys(SOURCE_LABELS) as [SourceKey, ...SourceKey[]]

export type AnalyticsRange = { from: string; to: string }

const DAY_MS = 86_400_000
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function toMytDay(ms: number) {
  return new Date(ms + MYT_OFFSET_MS).toISOString().slice(0, 10)
}

export function toDbDate(ms: number) {
  return new Date(ms).toISOString().replace("Z", "+00:00")
}

const mytDayStart = (day: string) => Date.parse(`${day}T00:00:00+08:00`)

export function rangeLength({ from, to }: AnalyticsRange) {
  return Math.round((mytDayStart(to) - mytDayStart(from)) / DAY_MS) + 1
}

function isDay(day: string) {
  const ms = mytDayStart(day)
  return DAY_PATTERN.test(day) && !Number.isNaN(ms) && toMytDay(ms) === day
}

export function isValidRange(range: AnalyticsRange) {
  return (
    isDay(range.from) &&
    isDay(range.to) &&
    range.from <= range.to &&
    rangeLength(range) <= MAX_RANGE_DAYS
  )
}

export function presetRange(days: number, now = Date.now()): AnalyticsRange {
  const to = toMytDay(now)
  return { from: toMytDay(mytDayStart(to) - (days - 1) * DAY_MS), to }
}

export function getAnalyticsRange(range: AnalyticsRange) {
  const startMs = mytDayStart(range.from)
  const length = rangeLength(range)

  return {
    since: toDbDate(startMs),
    until: toDbDate(startMs + length * DAY_MS),
    previousSince: toDbDate(startMs - length * DAY_MS),
    startDay: range.from,
    days: Array.from({ length }, (_, index) => toMytDay(startMs + index * DAY_MS)),
  }
}

export function clampRange(
  range: ReturnType<typeof getAnalyticsRange>,
  trackedSince: string
) {
  const trackedMs = Date.parse(trackedSince)
  const sinceMs = Math.max(Date.parse(range.since), trackedMs)
  const previousMs = Date.parse(range.previousSince)

  return {
    since: toDbDate(sinceMs),
    previousSince: toDbDate(Math.max(previousMs, trackedMs)),
    startDay: toMytDay(sinceMs),
    comparable: previousMs >= trackedMs,
  }
}

export function describeSourcePage(
  path: string,
  centerSlugs: Set<string>
): { key: SourceKey; sub?: string } {
  if (path === "/") return { key: "home" }
  if (path === "/peta") return { key: "map" }
  if (centerSlugs.has(path.slice(1))) return { key: "center" }
  if (path.startsWith("/rangkaian")) return { key: "chain", sub: path }
  if (path.startsWith("/lokasi")) return { key: "location", sub: path }
  return { key: "other", sub: path }
}
