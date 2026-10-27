import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { db } from "@/db/connection"
import { town } from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"
import { requireSuperadmin } from "@/lib/center-admin"
import { townSlug } from "@/lib/towns"

export const getTowns = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    return await db
      .select({ id: town.id, stateId: town.stateId, name: town.name })
      .from(town)
      .orderBy(town.name)
  })

export type TownRow = Awaited<ReturnType<typeof getTowns>>[number]

export const createTown = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ stateId: z.string().min(1), name: z.string().trim().min(1) }))
  .handler(async ({ context, data }): Promise<TownRow> => {
    await requireSuperadmin(context.session.user.id)

    const slug = townSlug(data.name)
    if (!slug) {
      throw new Error("Town name needs letters or numbers")
    }

    const [existing] = await db
      .select({ id: town.id, stateId: town.stateId, name: town.name })
      .from(town)
      .where(and(eq(town.stateId, data.stateId), eq(town.slug, slug)))
      .limit(1)
    if (existing) return existing

    const created = { id: crypto.randomUUID(), stateId: data.stateId, name: data.name }
    await db.insert(town).values({ ...created, slug })
    return created
  })
