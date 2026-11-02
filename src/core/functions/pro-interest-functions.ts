import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { count, desc, eq, isNotNull } from "drizzle-orm"
import { db } from "@/db/connection"
import { dialysisCenter, proInterest, town } from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"
import { requireCenterAccess } from "@/lib/access"
import { requireSuperadmin } from "@/lib/center-admin"
import { toDbDate } from "@/lib/analytics"

export const logUpgradeClick = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ centerId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await requireCenterAccess(context.session.user.id, data.centerId)
    await db.insert(proInterest).values({
      id: crypto.randomUUID(),
      dialysisCenterId: data.centerId,
      step: "upgrade_click",
      source: "admin",
      createdAt: toDbDate(Date.now()),
    })
  })

export const getProInterest = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuperadmin(context.session.user.id)

    const rows = await db
      .select({
        centerId: proInterest.dialysisCenterId,
        name: dialysisCenter.dialysisCenterName,
        step: proInterest.step,
        total: count(),
      })
      .from(proInterest)
      .leftJoin(dialysisCenter, eq(proInterest.dialysisCenterId, dialysisCenter.id))
      .groupBy(proInterest.dialysisCenterId, proInterest.step)

    const centers = new Map<string, { id: string; name: string; clicks: number; interested: number }>()
    let anonymousInterested = 0
    for (const row of rows) {
      if (!row.centerId) {
        if (row.step !== "upgrade_click") anonymousInterested += row.total
        continue
      }
      const center = centers.get(row.centerId) ?? {
        id: row.centerId,
        name: row.name ?? row.centerId,
        clicks: 0,
        interested: 0,
      }
      if (row.step === "upgrade_click") center.clicks += row.total
      else center.interested += row.total
      centers.set(row.centerId, center)
    }

    const contacts = await db
      .select({
        id: proInterest.id,
        name: proInterest.name,
        phone: proInterest.phone,
        title: proInterest.title,
        plan: proInterest.step,
        centerName: dialysisCenter.dialysisCenterName,
        townName: town.name,
        createdAt: proInterest.createdAt,
      })
      .from(proInterest)
      .leftJoin(dialysisCenter, eq(proInterest.dialysisCenterId, dialysisCenter.id))
      .leftJoin(town, eq(proInterest.townId, town.id))
      .where(isNotNull(proInterest.phone))
      .orderBy(desc(proInterest.createdAt))
      .limit(50)

    return {
      contacts,
      centers: [...centers.values()].sort(
        (a, b) => b.interested - a.interested || b.clicks - a.clicks
      ),
      anonymousInterested,
    }
  })
