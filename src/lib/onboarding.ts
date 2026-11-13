export const ONBOARDING_STEPS = ["profile", "verified", "whatsapp"] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export type OnboardingCenter = {
  id: string
  description: string | null
  phoneNumber: string
  address: string
  units: string
  verifiedAt: string | null
  whatsappPicPhoneNumber: string | null
  images: unknown[]
}

const filled = (value: string | null) => !!value?.trim()

const STEP_DONE: Record<OnboardingStep, (center: OnboardingCenter) => boolean> = {
  profile: (c) =>
    filled(c.description) &&
    filled(c.phoneNumber) &&
    filled(c.address) &&
    filled(c.units) &&
    c.images.length > 0,
  verified: (c) => !!c.verifiedAt,
  whatsapp: (c) => filled(c.whatsappPicPhoneNumber),
}

// A step is done once every centre the PIC manages passes it; the link goes to the first centre that doesn't.
export function onboardingSteps(centers: OnboardingCenter[]) {
  return ONBOARDING_STEPS.map((step) => {
    const pending = centers.find((center) => !STEP_DONE[step](center))
    return { step, done: !pending, centerId: pending?.id ?? centers[0]?.id }
  })
}
