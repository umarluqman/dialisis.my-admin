import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db/connection"
import { dialysisCenter, salesProspect } from "@/db/schema"
import { SALES_STAGES } from "@/lib/sales"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { authMiddleware } from "@/lib/middleware"
import { requireSuperadmin } from "@/lib/center-admin"

export const getSalesProspects = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuperadmin(context.session.user.id)
    await ensureAdminDatabaseSchema()

    const rows = await db
      .select({
        prospect: salesProspect,
        centerName: dialysisCenter.dialysisCenterName,
      })
      .from(salesProspect)
      .leftJoin(dialysisCenter, eq(salesProspect.dialysisCenterId, dialysisCenter.id))
      .orderBy(desc(salesProspect.updatedAt))

    return rows.map((row) => ({ ...row.prospect, centerName: row.centerName }))
  })

export type SalesProspectRow = Awaited<ReturnType<typeof getSalesProspects>>[number]

const optionalText = z
  .string()
  .nullable()
  .transform((value) => value?.trim() || null)

const SaveSalesProspectSchema = z.object({
  id: z.string().min(1).optional(),
  organization: z.string().trim().min(1),
  dialysisCenterId: z.string().min(1).nullable(),
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

    const { id, ...fields } = data
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
        id: crypto.randomUUID(),
        ...fields,
        ...reachedAt,
        createdBy: userId,
      })
    }

    return { success: true }
  })
