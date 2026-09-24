export const ANALYTICS_PERIODS = [7, 30, 90] as const
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]

const DAY_MS = 86_400_000
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000

export function toMytDay(ms: number) {
  return new Date(ms + MYT_OFFSET_MS).toISOString().slice(0, 10)
}

function toDbDate(ms: number) {
  return new Date(ms).toISOString().replace("Z", "+00:00")
}

export function getAnalyticsRange(period: AnalyticsPeriod, now = Date.now()) {
  const todayStartMs = Date.parse(`${toMytDay(now)}T00:00:00+08:00`)
  const startMs = todayStartMs - (period - 1) * DAY_MS
  const previousStartMs = startMs - period * DAY_MS

  return {
    since: toDbDate(startMs),
    previousSince: toDbDate(previousStartMs),
    startDay: toMytDay(startMs),
    days: Array.from({ length: period }, (_, index) =>
      toMytDay(startMs + index * DAY_MS)
    ),
  }
}

export function describeSourcePage(path: string, centerSlugs: Set<string>) {
  if (path === "/") return { label: "Home page" }
  if (path === "/peta") return { label: "Centers map" }
  if (centerSlugs.has(path.slice(1))) return { label: "Center page" }
  if (path.startsWith("/rangkaian")) return { label: "Chain page", sub: path }
  if (path.startsWith("/lokasi")) return { label: "Location listing", sub: path }
  return { label: "Other page", sub: path }
}
