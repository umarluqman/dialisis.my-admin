import {
  LEAD_FIX_AT,
  isTestLead,
  leadDuplicateKey,
} from "./lead-quality"

export type RawRecipientCenter = {
  id: string
  name: string
  slug: string
  town: string
  stateName: string | null
  companyId: string | null
  companyName: string | null
  companySlug: string | null
  claimed: boolean
}

export type RawRecipientCompany = {
  id: string
  name: string
  slug: string
}

export type RawRecipientLead = {
  id: string
  dialysisCenterId: string
  fullName: string
  phoneNumber: string
  additionalNotes: string | null
  status: string
  picNotificationStatus: string
  viewedAt: string | null
  createdAt: string
}

export type LeadRecipientLead = {
  id: string
  fullName: string
  createdAt: string
  status: "new" | "contacted" | "booked" | "rejected"
  delivered: boolean
  viewedAt: string | null
  submissions: number
  preFix: boolean
}

export type CenterLeadSummary = RawRecipientCenter & {
  leadsCount: number
  deliveredCount: number
  viewedCount: number
  contactedCount: number
  bookedCount: number
  firstLeadAt: string | null
  lastLeadAt: string | null
  leads: LeadRecipientLead[]
}

export type BrandLeadSummary = {
  id: string
  name: string
  slug: string
  totalBranches: number
  branchesWithLeads: number
  claimedBranches: number
  leadsCount: number
  deliveredCount: number
  viewedCount: number
  contactedCount: number
  bookedCount: number
  firstLeadAt: string | null
  lastLeadAt: string | null
  branches: CenterLeadSummary[]
}

export type LeadRecipientsSummary = {
  totalCenters: number
  centersWithLeads: number
  claimedCentersWithLeads: number
  unclaimedCentersWithLeads: number
  independentCentersWithLeads: number
  totalBrands: number
  brandsWithLeads: number
  totalLeads: number
  viewedLeads: number
  bookedLeads: number
  preFixLeadCount: number
}

export type LeadRecipientsReport = {
  summary: LeadRecipientsSummary
  centers: CenterLeadSummary[]
  brands: BrandLeadSummary[]
}

const STATUS_PRIORITY: Record<LeadRecipientLead["status"], number> = {
  new: 0,
  rejected: 1,
  contacted: 2,
  booked: 3,
}

function normalizeStatus(status: string): LeadRecipientLead["status"] {
  if (status === "contacted" || status === "booked" || status === "rejected") {
    return status
  }
  return "new"
}

function pickHigherStatus(
  a: LeadRecipientLead["status"],
  b: LeadRecipientLead["status"]
): LeadRecipientLead["status"] {
  return STATUS_PRIORITY[b] > STATUS_PRIORITY[a] ? b : a
}

function pickEarlier(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return Date.parse(b) < Date.parse(a) ? b : a
}

function pickLater(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return Date.parse(b) > Date.parse(a) ? b : a
}

export function buildLeadRecipientsReport({
  centers,
  companies,
  leads,
  includePreFix = false,
}: {
  centers: RawRecipientCenter[]
  companies: RawRecipientCompany[]
  leads: RawRecipientLead[]
  includePreFix?: boolean
}): LeadRecipientsReport {
  const fixMs = Date.parse(LEAD_FIX_AT)

  // Deduplicate all non-test leads by center + phone tail + MYT day.
  // Keep newest first so representative id/fullName comes from the latest submission.
  const sortedLeads = [...leads]
    .filter((lead) => !isTestLead(lead))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

  const deduped = new Map<string, LeadRecipientLead & { centerId: string }>()
  for (const row of sortedLeads) {
    const key = leadDuplicateKey(row)
    const status = normalizeStatus(row.status)
    const delivered = row.picNotificationStatus === "sent"
    const preFix = Date.parse(row.createdAt) < fixMs
    const existing = deduped.get(key)

    if (existing) {
      existing.submissions += 1
      existing.status = pickHigherStatus(existing.status, status)
      existing.delivered = existing.delivered || delivered
      existing.viewedAt = pickEarlier(existing.viewedAt, row.viewedAt)
      existing.preFix = existing.preFix && preFix
    } else {
      deduped.set(key, {
        id: row.id,
        centerId: row.dialysisCenterId,
        fullName: row.fullName,
        createdAt: row.createdAt,
        status,
        delivered,
        viewedAt: row.viewedAt,
        submissions: 1,
        preFix,
      })
    }
  }

  let preFixLeadCount = 0
  const leadsByCenter = new Map<string, LeadRecipientLead[]>()

  for (const { centerId, ...lead } of deduped.values()) {
    if (lead.preFix) preFixLeadCount += 1
    if (!includePreFix && lead.preFix) continue
    const list = leadsByCenter.get(centerId)
    if (list) list.push(lead)
    else leadsByCenter.set(centerId, [lead])
  }

  const centerSummaries: CenterLeadSummary[] = centers.map((center) => {
    const centerLeads = leadsByCenter.get(center.id) ?? []
    let deliveredCount = 0
    let viewedCount = 0
    let contactedCount = 0
    let bookedCount = 0
    let firstLeadAt: string | null = null
    let lastLeadAt: string | null = null

    for (const lead of centerLeads) {
      if (lead.delivered) deliveredCount += 1
      if (lead.viewedAt) viewedCount += 1
      if (lead.status === "contacted") contactedCount += 1
      if (lead.status === "booked") bookedCount += 1
      firstLeadAt = pickEarlier(firstLeadAt, lead.createdAt)
      lastLeadAt = pickLater(lastLeadAt, lead.createdAt)
    }

    return {
      ...center,
      leadsCount: centerLeads.length,
      deliveredCount,
      viewedCount,
      contactedCount,
      bookedCount,
      firstLeadAt,
      lastLeadAt,
      leads: centerLeads,
    }
  })

  const brandMap = new Map<string, BrandLeadSummary>()
  for (const company of companies) {
    brandMap.set(company.id, {
      id: company.id,
      name: company.name,
      slug: company.slug,
      totalBranches: 0,
      branchesWithLeads: 0,
      claimedBranches: 0,
      leadsCount: 0,
      deliveredCount: 0,
      viewedCount: 0,
      contactedCount: 0,
      bookedCount: 0,
      firstLeadAt: null,
      lastLeadAt: null,
      branches: [],
    })
  }

  for (const center of centerSummaries) {
    if (!center.companyId) continue
    let brand = brandMap.get(center.companyId)
    if (!brand) {
      brand = {
        id: center.companyId,
        name: center.companyName ?? "Unknown brand",
        slug: center.companySlug ?? "",
        totalBranches: 0,
        branchesWithLeads: 0,
        claimedBranches: 0,
        leadsCount: 0,
        deliveredCount: 0,
        viewedCount: 0,
        contactedCount: 0,
        bookedCount: 0,
        firstLeadAt: null,
        lastLeadAt: null,
        branches: [],
      }
      brandMap.set(center.companyId, brand)
    }

    brand.totalBranches += 1
    if (center.leadsCount > 0) brand.branchesWithLeads += 1
    if (center.claimed) brand.claimedBranches += 1
    brand.leadsCount += center.leadsCount
    brand.deliveredCount += center.deliveredCount
    brand.viewedCount += center.viewedCount
    brand.contactedCount += center.contactedCount
    brand.bookedCount += center.bookedCount
    brand.firstLeadAt = pickEarlier(brand.firstLeadAt, center.firstLeadAt)
    brand.lastLeadAt = pickLater(brand.lastLeadAt, center.lastLeadAt)
    brand.branches.push(center)
  }

  const brands = [...brandMap.values()].map((brand) => ({
    ...brand,
    branches: brand.branches.sort(
      (a, b) =>
        b.leadsCount - a.leadsCount ||
        (b.lastLeadAt ? Date.parse(b.lastLeadAt) : 0) -
          (a.lastLeadAt ? Date.parse(a.lastLeadAt) : 0) ||
        a.name.localeCompare(b.name)
    ),
  }))

  let centersWithLeads = 0
  let claimedCentersWithLeads = 0
  let unclaimedCentersWithLeads = 0
  let independentCentersWithLeads = 0
  let totalLeads = 0
  let viewedLeads = 0
  let bookedLeads = 0

  for (const center of centerSummaries) {
    if (center.leadsCount > 0) {
      centersWithLeads += 1
      if (center.claimed) claimedCentersWithLeads += 1
      else unclaimedCentersWithLeads += 1
      if (!center.companyId) independentCentersWithLeads += 1
      totalLeads += center.leadsCount
      viewedLeads += center.viewedCount
      bookedLeads += center.bookedCount
    }
  }

  const brandsWithLeads = brands.filter((brand) => brand.leadsCount > 0).length

  return {
    summary: {
      totalCenters: centerSummaries.length,
      centersWithLeads,
      claimedCentersWithLeads,
      unclaimedCentersWithLeads,
      independentCentersWithLeads,
      totalBrands: brands.length,
      brandsWithLeads,
      totalLeads,
      viewedLeads,
      bookedLeads,
      preFixLeadCount,
    },
    centers: centerSummaries,
    brands,
  }
}
