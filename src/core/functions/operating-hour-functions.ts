import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { eq, and, asc } from "drizzle-orm"
import { db } from "@/db/connection"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { centerOperatingHour, userCenterAccess } from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"
import { getUserRole } from "@/lib/user-role"

async function checkCenterAccess(userId: string, centerId: string) {
  const role = await getUserRole(userId)
  if (role === "superadmin") return

  const [access] = await db
    .select()
    .from(userCenterAccess)
    .where(
      and(
        eq(userCenterAccess.userId, userId),
        eq(userCenterAccess.dialysisCenterId, centerId)
      )
    )
    .limit(1)

  if (!access) throw new Error("Access denied")
}

export const getOperatingHoursForCenter = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ centerId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()
    await checkCenterAccess(context.session.user.id, data.centerId)

    return await db
      .select()
      .from(centerOperatingHour)
      .where(eq(centerOperatingHour.dialysisCenterId, data.centerId))
      .orderBy(asc(centerOperatingHour.dayOfWeek))
  })

const hourEntrySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  openTime: z.string(),
  closeTime: z.string(),
  isClosed: z.boolean(),
})

export const upsertOperatingHours = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      centerId: z.string().min(1),
      hours: z.array(hourEntrySchema).length(7),
    })
  )
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()
    await checkCenterAccess(context.session.user.id, data.centerId)

    // Delete existing hours for this center
    await db
      .delete(centerOperatingHour)
      .where(eq(centerOperatingHour.dialysisCenterId, data.centerId))

    // Insert all 7 days
    await db.insert(centerOperatingHour).values(
      data.hours.map((h) => ({
        id: crypto.randomUUID(),
        dayOfWeek: h.dayOfWeek,
        openTime: h.isClosed ? "00:00" : h.openTime,
        closeTime: h.isClosed ? "00:00" : h.closeTime,
        isClosed: h.isClosed,
        dialysisCenterId: data.centerId,
      }))
    )

    return { success: true }
  })
