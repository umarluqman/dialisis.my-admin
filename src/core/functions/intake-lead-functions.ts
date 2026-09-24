import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { and, desc, eq, inArray, not, sql, type SQL } from "drizzle-orm"
import { db } from "@/db/connection"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { dialysisCenter, intakeLead, userCenterAccess } from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"
import { getUserRole } from "@/lib/user-role"
import { toDbDate } from "@/lib/analytics"
import { getLeadQuality, leadDuplicateKey, testLeadSql } from "@/lib/lead-quality"

async function getAccessibleCenterIds(userId: string) {
  const rows = await db
    .select({ centerId: userCenterAccess.dialysisCenterId })
    .from(userCenterAccess)
    .where(eq(userCenterAccess.userId, userId))

  return rows.map((row) => row.centerId)
}

const GetIntakeLeadsSchema = z.object({
  centerId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
})

const leadFields = {
  id: intakeLead.id,
  dialysisCenterId: intakeLead.dialysisCenterId,
  centerName: dialysisCenter.dialysisCenterName,
  centerTown: dialysisCenter.town,
  fullName: intakeLead.fullName,
  myKadNumber: intakeLead.myKadNumber,
  homeAddress: intakeLead.homeAddress,
  preferredDate: intakeLead.preferredDate,
  preferredSession: intakeLead.preferredSession,
  phoneNumber: intakeLead.phoneNumber,
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
    const { session } = context
    const userId = session.user.id
    const userRole = await getUserRole(userId)
    const conditions: SQL[] = []

    if (data.centerId) {
      conditions.push(eq(intakeLead.dialysisCenterId, data.centerId))
    }

    if (userRole !== "superadmin") {
      const accessibleCenterIds = await getAccessibleCenterIds(userId)

      if (data.centerId && !accessibleCenterIds.includes(data.centerId)) {
        throw new Error("Access denied")
      }

      if (accessibleCenterIds.length === 0) {
        return []
      }

      conditions.push(inArray(intakeLead.dialysisCenterId, accessibleCenterIds))
    }

    if (conditions.length > 0) {
      const rows = await db
        .select(leadFields)
        .from(intakeLead)
        .innerJoin(
          dialysisCenter,
          eq(intakeLead.dialysisCenterId, dialysisCenter.id)
        )
        .where(and(...conditions))
        .orderBy(desc(intakeLead.createdAt))
        .limit(data.limit)
      return rows.map((lead) => withQuality(lead, now))
    }

    const rows = await db
      .select(leadFields)
      .from(intakeLead)
      .innerJoin(
        dialysisCenter,
        eq(intakeLead.dialysisCenterId, dialysisCenter.id)
      )
      .orderBy(desc(intakeLead.createdAt))
      .limit(data.limit)
    return rows.map((lead) => withQuality(lead, now))
  })

export const getFollowUpLeads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureAdminDatabaseSchema()

    const userId = context.session.user.id
    const conditions: SQL[] = [eq(intakeLead.status, "new"), not(testLeadSql)]

    if ((await getUserRole(userId)) !== "superadmin") {
      const accessibleCenterIds = await getAccessibleCenterIds(userId)
      if (accessibleCenterIds.length === 0) return []
      conditions.push(inArray(intakeLead.dialysisCenterId, accessibleCenterIds))
    }

    const rows = await db
      .select(leadFields)
      .from(intakeLead)
      .innerJoin(
        dialysisCenter,
        eq(intakeLead.dialysisCenterId, dialysisCenter.id)
      )
      .where(and(...conditions))
      .orderBy(desc(intakeLead.createdAt))

    const now = Date.now()
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
      status: z.enum(["contacted", "booked", "rejected"]),
    })
  )
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()

    const userId = context.session.user.id
    const leads = await db
      .select({ centerId: intakeLead.dialysisCenterId })
      .from(intakeLead)
      .where(inArray(intakeLead.id, data.ids))

    if (leads.length !== new Set(data.ids).size) {
      throw new Error("Lead not found")
    }

    if ((await getUserRole(userId)) !== "superadmin") {
      const accessibleCenterIds = await getAccessibleCenterIds(userId)
      if (leads.some((lead) => !accessibleCenterIds.includes(lead.centerId))) {
        throw new Error("Access denied")
      }
    }

    const now = toDbDate(Date.now())
    await db
      .update(intakeLead)
      .set({ status: data.status, statusUpdatedAt: now, updatedAt: sql`${now}` })
      .where(inArray(intakeLead.id, data.ids))
  })
