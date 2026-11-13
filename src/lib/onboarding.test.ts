import { describe, expect, it } from "vitest"
import { onboardingSteps, type OnboardingCenter } from "./onboarding"

const complete: OnboardingCenter = {
  id: "a",
  description: "Centre",
  phoneNumber: "031234567",
  address: "Jalan 1",
  units: "HD Unit",
  verifiedAt: "2026-11-01T00:00:00.000+00:00",
  whatsappPicPhoneNumber: "60123456789",
  images: [{}],
}

describe("onboardingSteps", () => {
  it("marks every step done for a complete centre", () => {
    expect(onboardingSteps([complete]).every((s) => s.done)).toBe(true)
  })

  it("links to the first centre missing a step", () => {
    const missing = { ...complete, id: "b", images: [], verifiedAt: null }
    const steps = onboardingSteps([complete, missing])
    expect(steps).toEqual([
      { step: "profile", done: false, centerId: "b" },
      { step: "verified", done: false, centerId: "b" },
      { step: "whatsapp", done: true, centerId: "a" },
    ])
  })

  it("treats blank WhatsApp numbers as missing", () => {
    const steps = onboardingSteps([{ ...complete, whatsappPicPhoneNumber: "  " }])
    expect(steps[2].done).toBe(false)
  })
})
