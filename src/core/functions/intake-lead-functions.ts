import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { and, desc, eq, inArray, type SQL } from "drizzle-orm"
import { db } from "@/db/connection"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { dialysisCenter, intakeLead, userCenterAccess } from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"
import { getUserRole } from "@/lib/user-role"

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
  createdAt: intakeLead.createdAt,
}

export const getIntakeLeads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(GetIntakeLeadsSchema)
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()

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
      return await db
        .select(leadFields)
        .from(intakeLead)
        .innerJoin(
          dialysisCenter,
          eq(intakeLead.dialysisCenterId, dialysisCenter.id)
        )
        .where(and(...conditions))
        .orderBy(desc(intakeLead.createdAt))
        .limit(data.limit)
    }

    return await db
      .select(leadFields)
      .from(intakeLead)
      .innerJoin(
        dialysisCenter,
        eq(intakeLead.dialysisCenterId, dialysisCenter.id)
      )
      .orderBy(desc(intakeLead.createdAt))
      .limit(data.limit)
  })
