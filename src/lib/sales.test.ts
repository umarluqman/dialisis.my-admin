import { describe, expect, it } from "vitest"
import { startOfMytWeek, weeklyScorecard } from "./sales"

const now = Date.parse("2026-09-27T04:00:00Z")

describe("startOfMytWeek", () => {
  it("starts on Monday midnight Malaysia time", () => {
    expect(new Date(startOfMytWeek(now)).toISOString()).toBe("2026-09-20T16:00:00.000Z")
  })
})

describe("weeklyScorecard", () => {
  it("counts stages reached this week and last week", () => {
    const at = (iso: string) => new Date(iso)
    const card = weeklyScorecard(
      [
        { createdAt: at("2026-09-22T00:00:00Z"), demoAt: at("2026-09-24T00:00:00Z"), pilotAt: null, paidAt: null },
        { createdAt: at("2026-09-15T00:00:00Z"), demoAt: null, pilotAt: null, paidAt: at("2026-09-25T00:00:00Z") },
        { createdAt: at("2026-09-01T00:00:00Z"), demoAt: null, pilotAt: null, paidAt: null },
      ],
      now
    )
    expect(card).toEqual([
      { stage: "contacted", thisWeek: 1, lastWeek: 1 },
      { stage: "demo", thisWeek: 1, lastWeek: 0 },
      { stage: "pilot", thisWeek: 0, lastWeek: 0 },
      { stage: "paid", thisWeek: 1, lastWeek: 0 },
    ])
  })
})
