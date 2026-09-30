import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { count, eq } from "drizzle-orm"
import { db } from "@/db/connection"
import { company, dialysisCenter, state } from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"
import { requireSuperadmin } from "@/lib/center-admin"
import { clearPreview, writePreview } from "@/lib/access"

export const getPreviewOptions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuperadmin(context.session.user.id)

    const [brands, centers] = await Promise.all([
      db
        .select({ id: company.id, name: company.name, centers: count() })
        .from(company)
        .innerJoin(dialysisCenter, eq(dialysisCenter.companyId, company.id))
        .groupBy(company.id)
        .orderBy(company.name),
      db
        .select({
          id: dialysisCenter.id,
          name: dialysisCenter.dialysisCenterName,
          town: dialysisCenter.town,
          state: state.name,
        })
        .from(dialysisCenter)
        .leftJoin(state, eq(dialysisCenter.stateId, state.id))
        .orderBy(dialysisCenter.dialysisCenterName),
    ])

    return { brands, centers }
  })

export const startPreview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.union([
      z.object({ companyId: z.string().min(1) }),
      z.object({ centerId: z.string().min(1) }),
    ])
  )
  .handler(async ({ context, data }) => {
    await requireSuperadmin(context.session.user.id)

    const isBrand = "companyId" in data
    const centers = await db
      .select({
        id: dialysisCenter.id,
        name: dialysisCenter.dialysisCenterName,
        brand: company.name,
      })
      .from(dialysisCenter)
      .leftJoin(company, eq(dialysisCenter.companyId, company.id))
      .where(
        isBrand
          ? eq(dialysisCenter.companyId, data.companyId)
          : eq(dialysisCenter.id, data.centerId)
      )

    if (centers.length === 0) {
      throw new Error("No centres to preview")
    }

    writePreview({
      label: (isBrand && centers[0].brand) || centers[0].name,
      centerIds: centers.map((center) => center.id),
    })
  })

export const stopPreview = createServerFn({ method: "POST" }).handler(() => {
  clearPreview()
})
