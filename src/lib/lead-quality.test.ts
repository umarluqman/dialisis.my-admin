import { describe, expect, it } from "vitest"

import {
  LEAD_FIX_AT,
  STALE_AFTER_MS,
  getLeadQuality,
  isTestLead,
  leadDuplicateKey,
} from "./lead-quality"

const fixMs = Date.parse(LEAD_FIX_AT)
const lead = (overrides: Partial<Parameters<typeof getLeadQuality>[0]> = {}) => ({
  createdAt: new Date(fixMs + 60_000).toISOString(),
  status: "new",
  fullName: "Aminah binti Ali",
  additionalNotes: null,
  ...overrides,
})

describe("isTestLead", () => {
  it("flags test words in the name and notes starting with testing", () => {
    expect(isTestLead({ fullName: "TEST Pesakit", additionalNotes: null })).toBe(true)
    expect(isTestLead({ fullName: "Ujian satu", additionalNotes: null })).toBe(true)
    expect(isTestLead({ fullName: "Aminah", additionalNotes: "  Testing form" })).toBe(true)
    expect(isTestLead({ fullName: "Aminah", additionalNotes: "Not testing" })).toBe(false)
  })
})

describe("getLeadQuality", () => {
  const now = fixMs + STALE_AFTER_MS + 10 * 60_000

  it("marks test leads before anything else", () => {
    expect(getLeadQuality(lead({ fullName: "debug", createdAt: "2026-09-01T00:00:00.000+00:00" }), now)).toBe("test")
  })

  it("marks every lead before the fix as invalid, whatever its status", () => {
    const createdAt = new Date(fixMs - 1).toISOString()
    expect(getLeadQuality(lead({ createdAt }), now)).toBe("invalid")
    expect(getLeadQuality(lead({ createdAt, status: "booked" }), now)).toBe("invalid")
  })

  it("marks post-fix leads still new after 48h as stale", () => {
    expect(getLeadQuality(lead(), now)).toBe("stale")
    expect(getLeadQuality(lead({ status: "contacted" }), now)).toBe("valid")
    expect(getLeadQuality(lead(), fixMs + STALE_AFTER_MS)).toBe("valid")
  })
})

describe("leadDuplicateKey", () => {
  it("matches the same center, phone tail and Malaysia day", () => {
    const a = leadDuplicateKey({
      dialysisCenterId: "c1",
      phoneNumber: "+60 12-345 6789",
      createdAt: "2026-09-24T15:00:00.000+00:00",
    })
    const b = leadDuplicateKey({
      dialysisCenterId: "c1",
      phoneNumber: "0123456789",
      createdAt: "2026-09-25T15:59:00.000+00:00",
    })
    expect(a).toBe("c1|123456789|2026-09-24")
    expect(b).toBe("c1|123456789|2026-09-25")
  })

  it("keeps different centers and days apart", () => {
    const key = (dialysisCenterId: string, createdAt: string) =>
      leadDuplicateKey({ dialysisCenterId, phoneNumber: "0123456789", createdAt })
    expect(key("c1", "2026-09-24T15:59:00.000+00:00")).not.toBe(key("c1", "2026-09-24T16:00:00.000+00:00"))
    expect(key("c1", "2026-09-24T01:00:00.000+00:00")).not.toBe(key("c2", "2026-09-24T01:00:00.000+00:00"))
  })
})
