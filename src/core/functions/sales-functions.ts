import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db/connection"
import { dialysisCenter, salesProspect, salesProspectCenter } from "@/db/schema"
import { SALES_STAGES } from "@/lib/sales"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { authMiddleware } from "@/lib/middleware"
import { requireSuperadmin } from "@/lib/center-admin"

export const getSalesProspects = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuperadmin(context.session.user.id)
    await ensureAdminDatabaseSchema()

    const [prospects, links] = await Promise.all([
      db.select().from(salesProspect).orderBy(desc(salesProspect.updatedAt)),
      db
        .select({
          prospectId: salesProspectCenter.prospectId,
          id: dialysisCenter.id,
          name: dialysisCenter.dialysisCenterName,
        })
        .from(salesProspectCenter)
        .innerJoin(dialysisCenter, eq(salesProspectCenter.dialysisCenterId, dialysisCenter.id)),
    ])

    return prospects.map(({ dialysisCenterId: _, ...prospect }) => ({
      ...prospect,
      centers: links
        .filter((link) => link.prospectId === prospect.id)
        .map(({ id, name }) => ({ id, name })),
    }))
  })

export type SalesProspectRow = Awaited<ReturnType<typeof getSalesProspects>>[number]

const optionalText = z
  .string()
  .nullable()
  .transform((value) => value?.trim() || null)

const SaveSalesProspectSchema = z.object({
  id: z.string().min(1).optional(),
  organization: z.string().trim().min(1),
  dialysisCenterIds: z.array(z.string().min(1)),
  contactName: optionalText,
  phone: optionalText,
  stage: z.enum(SALES_STAGES),
  lostReason: optionalText,
  notes: optionalText,
  nextFollowUpAt: z.date().nullable(),
})

const STAGE_REACHED_AT = {
  demo: "demoAt",
  pilot: "pilotAt",
  paid: "paidAt",
  lost: "lostAt",
} as const

export const saveSalesProspect = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(SaveSalesProspectSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session.user.id
    await requireSuperadmin(userId)
    await ensureAdminDatabaseSchema()

    const { id, dialysisCenterIds, ...fields } = data
    const prospectId = id ?? crypto.randomUUID()
    const [existing] = id
      ? await db.select().from(salesProspect).where(eq(salesProspect.id, id)).limit(1)
      : []

    if (id && !existing) {
      throw new Error("Prospect not found")
    }

    const reachedKey = data.stage === "contacted" ? null : STAGE_REACHED_AT[data.stage]
    const reachedAt =
      reachedKey && !existing?.[reachedKey] ? { [reachedKey]: new Date() } : {}

    if (existing) {
      await db
        .update(salesProspect)
        .set({ ...fields, ...reachedAt })
        .where(eq(salesProspect.id, existing.id))
    } else {
      await db.insert(salesProspect).values({
        id: prospectId,
        ...fields,
        ...reachedAt,
        createdBy: userId,
      })
    }

    await db.delete(salesProspectCenter).where(eq(salesProspectCenter.prospectId, prospectId))
    if (dialysisCenterIds.length > 0) {
      await db.insert(salesProspectCenter).values(
        [...new Set(dialysisCenterIds)].map((dialysisCenterId) => ({ prospectId, dialysisCenterId }))
      )
    }

    return { success: true }
  })
