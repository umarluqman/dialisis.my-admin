import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { eq, asc } from "drizzle-orm"
import { db } from "@/db/connection"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { centerOperatingHour } from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"
import { requireCenterAccess } from "@/lib/access"

export const getOperatingHoursForCenter = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ centerId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()
    await requireCenterAccess(context.session.user.id, data.centerId)

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
    await requireCenterAccess(context.session.user.id, data.centerId)

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
