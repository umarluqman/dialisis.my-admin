import { describe, expect, it } from "vitest"

import {
  clampRange,
  describeSourcePage,
  getAnalyticsRange,
  isValidRange,
  presetRange,
} from "./analytics"

describe("presetRange", () => {
  it("ends on today in Malaysia time", () => {
    expect(presetRange(7, Date.parse("2026-09-24T17:30:00Z"))).toEqual({
      from: "2026-09-19",
      to: "2026-09-25",
    })
  })
})

describe("isValidRange", () => {
  it("accepts ordered real days within the max length", () => {
    expect(isValidRange({ from: "2026-09-01", to: "2026-09-01" })).toBe(true)
    expect(isValidRange({ from: "2026-01-01", to: "2026-12-31" })).toBe(true)
  })

  it("rejects reversed, malformed, impossible and overlong ranges", () => {
    expect(isValidRange({ from: "2026-09-02", to: "2026-09-01" })).toBe(false)
    expect(isValidRange({ from: "2026-9-1", to: "2026-09-01" })).toBe(false)
    expect(isValidRange({ from: "2026-02-30", to: "2026-03-01" })).toBe(false)
    expect(isValidRange({ from: "2026-13-01", to: "2026-13-02" })).toBe(false)
    expect(isValidRange({ from: "2025-01-01", to: "2026-09-01" })).toBe(false)
  })
})

describe("getAnalyticsRange", () => {
  it("uses Malaysia days and ISO bounds matching stored createdAt", () => {
    const range = getAnalyticsRange({ from: "2026-09-19", to: "2026-09-25" })

    expect(range.startDay).toBe("2026-09-19")
    expect(range.days).toEqual([
      "2026-09-19",
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
    ])
    expect(range.since).toBe("2026-09-18T16:00:00.000+00:00")
    expect(range.until).toBe("2026-09-25T16:00:00.000+00:00")
    expect(range.previousSince).toBe("2026-09-11T16:00:00.000+00:00")
  })

  it("covers exactly one day for a single-day range", () => {
    const range = getAnalyticsRange({ from: "2026-09-25", to: "2026-09-25" })

    expect(range.days).toEqual(["2026-09-25"])
    expect(range.since).toBe("2026-09-24T16:00:00.000+00:00")
    expect(range.until).toBe("2026-09-25T16:00:00.000+00:00")
    expect(range.previousSince).toBe("2026-09-23T16:00:00.000+00:00")
  })
})

describe("clampRange", () => {
  const range = getAnalyticsRange({ from: "2026-09-19", to: "2026-09-25" })

  it("starts at tracking start and disables comparison when tracking is newer", () => {
    expect(clampRange(range, "2026-09-24T12:01:50.000+00:00")).toEqual({
      since: "2026-09-24T12:01:50.000+00:00",
      previousSince: "2026-09-24T12:01:50.000+00:00",
      startDay: "2026-09-24",
      comparable: false,
    })
  })

  it("keeps the period and comparison once both periods are tracked", () => {
    expect(clampRange(range, "2026-09-11T16:00:00.000+00:00")).toEqual({
      since: range.since,
      previousSince: range.previousSince,
      startDay: "2026-09-19",
      comparable: true,
    })
  })

  it("clamps only the previous period when tracking started within it", () => {
    const clamped = clampRange(range, "2026-09-15T00:00:00.000+00:00")

    expect(clamped.since).toBe(range.since)
    expect(clamped.previousSince).toBe("2026-09-15T00:00:00.000+00:00")
    expect(clamped.comparable).toBe(false)
  })
})

describe("describeSourcePage", () => {
  it("labels center pages only for known slugs", () => {
    const slugs = new Set(["pusat-a"])

    expect(describeSourcePage("/pusat-a", slugs)).toEqual({ key: "center" })
    expect(describeSourcePage("/tentang-kami", slugs)).toEqual({
      key: "other",
      sub: "/tentang-kami",
    })
    expect(describeSourcePage("/lokasi/selangor", slugs).key).toBe("location")
  })
})
