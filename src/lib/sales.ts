import { toMytDay } from "@/lib/analytics"

export const SALES_STAGES = ["contacted", "demo", "pilot", "paid", "lost"] as const

const WEEK_MS = 7 * 86_400_000

export const SCORECARD_STAGES = ["contacted", "demo", "pilot", "paid"] as const

type StageDates = {
  createdAt: Date
  demoAt: Date | null
  pilotAt: Date | null
  paidAt: Date | null
}

export function startOfMytWeek(now: number) {
  const day = toMytDay(now)
  const mondayOffset = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7
  return Date.parse(`${day}T00:00:00+08:00`) - mondayOffset * 86_400_000
}

export function weeklyScorecard(prospects: StageDates[], now = Date.now()) {
  const thisWeek = startOfMytWeek(now)
  const lastWeek = thisWeek - WEEK_MS
  const reachedAt = (prospect: StageDates) => ({
    contacted: prospect.createdAt,
    demo: prospect.demoAt,
    pilot: prospect.pilotAt,
    paid: prospect.paidAt,
  })

  return SCORECARD_STAGES.map((stage) => {
    const times = prospects
      .map((prospect) => reachedAt(prospect)[stage]?.getTime())
      .filter((time) => time !== undefined)
    return {
      stage,
      thisWeek: times.filter((time) => time >= thisWeek).length,
      lastWeek: times.filter((time) => time >= lastWeek && time < thisWeek).length,
    }
  })
}
