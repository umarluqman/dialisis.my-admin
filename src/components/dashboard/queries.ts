import { queryOptions } from "@tanstack/react-query"
import {
  getCentersForUser,
  getCurrentUserRole,
} from "@/core/functions/center-functions"
import { getAllCenters } from "@/core/functions/invitation-functions"
import {
  getCompanies,
  getFeaturedSlots,
} from "@/core/functions/featured-slot-functions"
import { getColdEmailConfig, getSalesProspects } from "@/core/functions/sales-functions"
import { getOnboarding } from "@/core/functions/onboarding-functions"
import { getProInterest } from "@/core/functions/pro-interest-functions"
import {
  getFollowUpLeads,
  getIntakeLeads,
  getLeadRecipients,
} from "@/core/functions/intake-lead-functions"

export const userRoleQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["userRole", userId],
    queryFn: () => getCurrentUserRole(),
    enabled: !!userId,
  })

export const centersQuery = queryOptions({
  queryKey: ["centers"],
  queryFn: () => getCentersForUser(),
})

export const allCentersQuery = queryOptions({
  queryKey: ["allCenters"],
  queryFn: () => getAllCenters(),
})

export const LEAD_LIMIT = 100

export const intakeLeadsQuery = queryOptions({
  queryKey: ["intakeLeads"],
  queryFn: () => getIntakeLeads({ data: { limit: LEAD_LIMIT } }),
})

export const followUpLeadsQuery = queryOptions({
  queryKey: ["followUpLeads"],
  queryFn: () => getFollowUpLeads(),
})

export const leadRecipientsQuery = queryOptions({
  queryKey: ["leadRecipients"],
  queryFn: () => getLeadRecipients(),
})

export const featuredSlotsQuery = queryOptions({
  queryKey: ["featuredSlots"],
  queryFn: () => getFeaturedSlots(),
})

export const companiesQuery = queryOptions({
  queryKey: ["companies"],
  queryFn: () => getCompanies(),
})

export const salesProspectsQuery = queryOptions({
  queryKey: ["salesProspects"],
  queryFn: () => getSalesProspects(),
})

export const coldEmailConfigQuery = queryOptions({
  queryKey: ["coldEmailConfig"],
  queryFn: () => getColdEmailConfig(),
})

export const proInterestQuery = queryOptions({
  queryKey: ["proInterest"],
  queryFn: () => getProInterest(),
})

export const onboardingQuery = queryOptions({
  queryKey: ["onboarding"],
  queryFn: () => getOnboarding(),
})
