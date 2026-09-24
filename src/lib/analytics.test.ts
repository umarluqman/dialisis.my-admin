import { describe, expect, it } from "vitest"

import { describeSourcePage, getAnalyticsRange } from "./analytics"

describe("getAnalyticsRange", () => {
  it("uses Malaysia days and ISO bounds matching stored createdAt", () => {
    const range = getAnalyticsRange(7, Date.parse("2026-09-24T17:30:00Z"))

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
    expect(range.previousSince).toBe("2026-09-11T16:00:00.000+00:00")
  })
})

describe("describeSourcePage", () => {
  it("labels center pages only for known slugs", () => {
    const slugs = new Set(["pusat-a"])

    expect(describeSourcePage("/pusat-a", slugs)).toEqual({ label: "Center page" })
    expect(describeSourcePage("/tentang-kami", slugs)).toEqual({
      label: "Other page",
      sub: "/tentang-kami",
    })
    expect(describeSourcePage("/lokasi/selangor", slugs).label).toBe(
      "Location listing"
    )
  })
})
