import { describe, expect, it } from "vitest"
import { endOfMytDay, isPlanActive, toMytDayInput } from "./plan"

const now = Date.parse("2026-09-27T00:00:00Z")

describe("isPlanActive", () => {
  it("requires pro", () => {
    expect(isPlanActive({ plan: "asas", planEndsAt: null }, now)).toBe(false)
    expect(isPlanActive({ plan: "pro", planEndsAt: null }, now)).toBe(true)
  })

  it("expires after planEndsAt", () => {
    expect(
      isPlanActive({ plan: "pro", planEndsAt: "2026-09-26T23:59:59.999+00:00" }, now)
    ).toBe(false)
    expect(
      isPlanActive({ plan: "pro", planEndsAt: "2026-09-28T00:00:00.000+00:00" }, now)
    ).toBe(true)
  })
})

describe("endOfMytDay", () => {
  it("round-trips a Malaysia day", () => {
    const value = endOfMytDay("2027-09-27")
    expect(value).toBe("2027-09-27T15:59:59.999+00:00")
    expect(toMytDayInput(value)).toBe("2027-09-27")
  })
})
