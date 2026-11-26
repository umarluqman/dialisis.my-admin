import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { and, desc, eq, inArray, not, sql } from "drizzle-orm"
import { db } from "@/db/connection"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import {
  company,
  dialysisCenter,
  intakeLead,
  state,
  userCenterAccess,
} from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"
import { getAccess } from "@/lib/access"
import { requireSuperadmin } from "@/lib/center-admin"
import { toDbDate } from "@/lib/analytics"
import { getLeadQuality, leadDuplicateKey, testLeadSql } from "@/lib/lead-quality"

// undefined = superadmin (no scope), null = PIC with no centre
async function picLeadScope(userId: string) {
  const { role, centerIds } = await getAccess(userId)
  if (role === "superadmin") return undefined
  if (centerIds.length === 0) return null
  return inArray(dialysisCenter.id, centerIds)
}

const GetIntakeLeadsSchema = z.object({
  id: z.string().optional(),
  centerId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
})

const leadFields = {
  id: intakeLead.id,
  dialysisCenterId: intakeLead.dialysisCenterId,
  centerName: dialysisCenter.dialysisCenterName,
  centerSlug: dialysisCenter.slug,
  centerTown: dialysisCenter.town,
  fullName: intakeLead.fullName,
  myKadNumber: intakeLead.myKadNumber,
  homeAddress: intakeLead.homeAddress,
  preferredDate: intakeLead.preferredDate,
  preferredSession: intakeLead.preferredSession,
  phoneNumber: intakeLead.phoneNumber,
  patientType: intakeLead.patientType,
  labResultOriginalName: intakeLead.labResultOriginalName,
  additionalNotes: intakeLead.additionalNotes,
  whatsappHandoffUrl: intakeLead.whatsappHandoffUrl,
  picNotificationStatus: intakeLead.picNotificationStatus,
  picNotificationMessageId: intakeLead.picNotificationMessageId,
  picNotificationError: intakeLead.picNotificationError,
  accessExpiresAt: intakeLead.accessExpiresAt,
  viewedAt: intakeLead.viewedAt,
  status: intakeLead.status,
  createdAt: intakeLead.createdAt,
}

function withQuality<T extends {
  dialysisCenterId: string
  phoneNumber: string
  fullName: string
  additionalNotes: string | null
  status: string
  createdAt: Date
}>(lead: T, now: number) {
  const scored = { ...lead, createdAt: lead.createdAt.toISOString() }
  return {
    ...lead,
    quality: getLeadQuality(scored, now),
    duplicateKey: leadDuplicateKey(scored),
  }
}

export const getIntakeLeads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(GetIntakeLeadsSchema)
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()

    const now = Date.now()
    const scope = await picLeadScope(context.session.user.id)
    if (scope === null) return []

    const rows = await db
      .select({
        ...leadFields,
        accessToken: intakeLead.accessToken,
        centerEmail: dialysisCenter.email,
        centerPhoneNumber: dialysisCenter.phoneNumber,
      })
      .from(intakeLead)
      .innerJoin(
        dialysisCenter,
        eq(intakeLead.dialysisCenterId, dialysisCenter.id)
      )
      .where(
        and(
          data.id ? eq(intakeLead.id, data.id) : undefined,
          data.centerId ? eq(intakeLead.dialysisCenterId, data.centerId) : undefined,
          scope
        )
      )
      .orderBy(desc(intakeLead.createdAt))
      .limit(data.limit)
    return rows.map(({ accessToken, centerEmail, centerPhoneNumber, ...lead }) => ({
      ...withQuality(lead, now),
      outreach:
        scope === undefined ? { accessToken, centerEmail, centerPhoneNumber } : null,
    }))
  })

export const getFollowUpLeads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureAdminDatabaseSchema()

    const now = Date.now()
    const scope = await picLeadScope(context.session.user.id)
    if (scope === null) return []

    const rows = await db
      .select(leadFields)
      .from(intakeLead)
      .innerJoin(
        dialysisCenter,
        eq(intakeLead.dialysisCenterId, dialysisCenter.id)
      )
      .where(and(eq(intakeLead.status, "new"), not(testLeadSql), scope))
      .orderBy(desc(intakeLead.createdAt))

    const groups = new Map<
      string,
      ReturnType<typeof withQuality<(typeof rows)[number]>> & { ids: string[] }
    >()
    for (const row of rows) {
      const lead = withQuality(row, now)
      const group = groups.get(lead.duplicateKey)
      if (group) group.ids.push(lead.id)
      else groups.set(lead.duplicateKey, { ...lead, ids: [lead.id] })
    }

    return [...groups.values()].flatMap((lead) =>
      lead.quality === "invalid" || lead.quality === "stale"
        ? [{ ...lead, reason: lead.quality }]
        : []
    )
  })

export const updateIntakeLeadStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      ids: z.array(z.string().min(1)).min(1).max(50),
      status: z.enum(["new", "contacted", "booked", "rejected"]),
    })
  )
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()

    const scope = await picLeadScope(context.session.user.id)
    if (scope !== undefined) {
      const allowed = scope
        ? await db
            .select({ id: intakeLead.id })
            .from(intakeLead)
            .innerJoin(
              dialysisCenter,
              eq(intakeLead.dialysisCenterId, dialysisCenter.id)
            )
            .where(and(inArray(intakeLead.id, data.ids), scope))
        : []
      if (allowed.length !== data.ids.length) throw new Error("Access denied")
    }

    const now = toDbDate(Date.now())
    await db
      .update(intakeLead)
      .set({
        status: data.status,
        statusUpdatedAt: data.status === "new" ? null : now,
        updatedAt: sql`${now}`,
      })
      .where(inArray(intakeLead.id, data.ids))
  })

function toIsoString(value: Date | string | number | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export const getLeadRecipients = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuperadmin(context.session.user.id)
    await ensureAdminDatabaseSchema()

    const [centers, companies, claimedRows, leads] = await Promise.all([
      db
        .select({
          id: dialysisCenter.id,
          name: dialysisCenter.dialysisCenterName,
          slug: dialysisCenter.slug,
          town: dialysisCenter.town,
          stateName: state.name,
          companyId: dialysisCenter.companyId,
          companyName: company.name,
          companySlug: company.slug,
        })
        .from(dialysisCenter)
        .leftJoin(state, eq(dialysisCenter.stateId, state.id))
        .leftJoin(company, eq(dialysisCenter.companyId, company.id))
        .orderBy(dialysisCenter.dialysisCenterName),
      db
        .select({
          id: company.id,
          name: company.name,
          slug: company.slug,
        })
        .from(company)
        .orderBy(company.name),
      db
        .selectDistinct({ centerId: userCenterAccess.dialysisCenterId })
        .from(userCenterAccess),
      db
        .select({
          id: intakeLead.id,
          dialysisCenterId: intakeLead.dialysisCenterId,
          fullName: intakeLead.fullName,
          phoneNumber: intakeLead.phoneNumber,
          additionalNotes: intakeLead.additionalNotes,
          status: intakeLead.status,
          picNotificationStatus: intakeLead.picNotificationStatus,
          viewedAt: intakeLead.viewedAt,
          createdAt: intakeLead.createdAt,
        })
        .from(intakeLead)
        .where(not(testLeadSql))
        .orderBy(desc(intakeLead.createdAt)),
    ])

    const claimedIds = new Set(claimedRows.map((row) => row.centerId))

    return {
      centers: centers.map((center) => ({
        ...center,
        claimed: claimedIds.has(center.id),
      })),
      companies,
      leads: leads.map((lead) => ({
        ...lead,
        viewedAt: toIsoString(lead.viewedAt),
        createdAt: toIsoString(lead.createdAt) ?? new Date(0).toISOString(),
      })),
    }
  })
