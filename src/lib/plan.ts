import { toDbDate, toMytDay } from "@/lib/analytics"

export const EARLYBIRD_SEATS = 30

export function isPlanActive(
  center: { plan: string; planEndsAt: string | null },
  now = Date.now()
) {
  return (
    center.plan === "pro" &&
    (!center.planEndsAt || Date.parse(center.planEndsAt) > now)
  )
}

export function endOfMytDay(day: string) {
  return toDbDate(Date.parse(`${day}T23:59:59.999+08:00`))
}

export function toMytDayInput(value: string | null) {
  return value ? toMytDay(Date.parse(value)) : ""
}
