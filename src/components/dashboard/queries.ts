import { queryOptions } from "@tanstack/react-query"
import {
  getCentersForUser,
  getCurrentUserRole,
} from "@/core/functions/center-functions"
import { getAllCenters } from "@/core/functions/invitation-functions"
import { getIntakeLeads } from "@/core/functions/intake-lead-functions"

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
