import { describe, expect, it } from "vitest"
import { LEAD_FIX_AT } from "./lead-quality"
import {
  buildLeadRecipientsReport,
  type RawRecipientCenter,
  type RawRecipientCompany,
  type RawRecipientLead,
} from "./lead-recipients"

const fixMs = Date.parse(LEAD_FIX_AT)
const postFix = (offsetMinutes: number) =>
  new Date(fixMs + offsetMinutes * 60_000).toISOString()
const preFix = (offsetMinutes: number) =>
  new Date(fixMs - offsetMinutes * 60_000).toISOString()

const companies: RawRecipientCompany[] = [
  { id: "co-davita", name: "DaVita", slug: "davita" },
  { id: "co-kpj", name: "KPJ", slug: "kpj" },
]

const centers: RawRecipientCenter[] = [
  {
    id: "c1",
    name: "DaVita Cheras",
    slug: "davita-cheras",
    town: "Cheras",
    stateName: "Kuala Lumpur",
    companyId: "co-davita",
    companyName: "DaVita",
    companySlug: "davita",
    claimed: true,
  },
  {
    id: "c2",
    name: "DaVita Shah Alam",
    slug: "davita-shah-alam",
    town: "Shah Alam",
    stateName: "Selangor",
    companyId: "co-davita",
    companyName: "DaVita",
    companySlug: "davita",
    claimed: false,
  },
  {
    id: "c3",
    name: "KPJ Ampang",
    slug: "kpj-ampang",
    town: "Ampang",
    stateName: "Selangor",
    companyId: "co-kpj",
    companyName: "KPJ",
    companySlug: "kpj",
    claimed: false,
  },
  {
    id: "c4",
    name: "Klinik Dialisis Merdeka",
    slug: "klinik-dialisis-merdeka",
    town: "Ipoh",
    stateName: "Perak",
    companyId: null,
    companyName: null,
    companySlug: null,
    claimed: false,
  },
]

const makeLead = (
  overrides: Partial<RawRecipientLead> & { id: string; dialysisCenterId: string }
): RawRecipientLead => ({
  fullName: "Aminah binti Ali",
  phoneNumber: "0123456789",
  additionalNotes: null,
  status: "new",
  picNotificationStatus: "sent",
  viewedAt: null,
  createdAt: postFix(10),
  ...overrides,
})

describe("buildLeadRecipientsReport", () => {
  it("groups leads by center and brand, excluding test and pre-fix leads by default", () => {
    const leads: RawRecipientLead[] = [
      makeLead({ id: "l1", dialysisCenterId: "c1", status: "booked", viewedAt: postFix(20) }),
      makeLead({
        id: "l2",
        dialysisCenterId: "c2",
        phoneNumber: "0198887777",
        status: "contacted",
        createdAt: postFix(30),
      }),
      // Test lead should never be counted
      makeLead({ id: "l-test", dialysisCenterId: "c3", fullName: "Test User" }),
      // Pre-fix lead should be counted in preFixLeadCount, excluded when includePreFix=false
      makeLead({ id: "l-old", dialysisCenterId: "c4", createdAt: preFix(60) }),
    ]

    const report = buildLeadRecipientsReport({ centers, companies, leads })

    expect(report.summary).toEqual({
      totalCenters: 4,
      centersWithLeads: 2,
      claimedCentersWithLeads: 1,
      unclaimedCentersWithLeads: 1,
      independentCentersWithLeads: 0,
      totalBrands: 2,
      brandsWithLeads: 1,
      totalLeads: 2,
      viewedLeads: 1,
      bookedLeads: 1,
      preFixLeadCount: 1,
    })

    const davita = report.brands.find((b) => b.id === "co-davita")!
    expect(davita.totalBranches).toBe(2)
    expect(davita.branchesWithLeads).toBe(2)
    expect(davita.claimedBranches).toBe(1)
    expect(davita.leadsCount).toBe(2)
    expect(davita.viewedCount).toBe(1)
    expect(davita.bookedCount).toBe(1)
    expect(davita.contactedCount).toBe(1)

    const kpj = report.brands.find((b) => b.id === "co-kpj")!
    expect(kpj.leadsCount).toBe(0)
    expect(kpj.branchesWithLeads).toBe(0)
  })

  it("includes pre-fix leads and independent centers when includePreFix is true", () => {
    const leads: RawRecipientLead[] = [
      makeLead({ id: "l-old", dialysisCenterId: "c4", createdAt: preFix(60) }),
    ]

    const report = buildLeadRecipientsReport({
      centers,
      companies,
      leads,
      includePreFix: true,
    })

    expect(report.summary.centersWithLeads).toBe(1)
    expect(report.summary.independentCentersWithLeads).toBe(1)
    expect(report.summary.preFixLeadCount).toBe(1)
    const independent = report.centers.find((c) => c.id === "c4")!
    expect(independent.leadsCount).toBe(1)
    expect(independent.leads[0].preFix).toBe(true)
  })

  it("deduplicates same-day same-phone submissions and preserves strongest outcome", () => {
    const leads: RawRecipientLead[] = [
      makeLead({
        id: "l1",
        dialysisCenterId: "c1",
        phoneNumber: "+60 12-345 6789",
        status: "contacted",
        viewedAt: postFix(15),
        createdAt: postFix(10),
      }),
      makeLead({
        id: "l2",
        dialysisCenterId: "c1",
        phoneNumber: "0123456789",
        status: "new",
        picNotificationStatus: "failed",
        viewedAt: null,
        createdAt: postFix(25),
      }),
    ]

    const report = buildLeadRecipientsReport({ centers, companies, leads })
    const cheras = report.centers.find((c) => c.id === "c1")!

    expect(cheras.leadsCount).toBe(1)
    expect(cheras.deliveredCount).toBe(1)
    expect(cheras.viewedCount).toBe(1)
    expect(cheras.contactedCount).toBe(1)
    expect(cheras.leads[0]).toMatchObject({
      id: "l2",
      status: "contacted",
      delivered: true,
      viewedAt: postFix(15),
      submissions: 2,
    })
  })
})
