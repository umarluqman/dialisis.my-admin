import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { and, desc, eq, gt, lt, sql } from "drizzle-orm"
import { db } from "@/db/connection"
import { dialysisCenter, featuredSlot, state } from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"
import { toDbDate } from "@/lib/analytics"
import { citiesForState, isCenterInTown } from "@/lib/cities"
import { revalidateCenter, requireSuperadmin } from "@/lib/center-admin"

export const getFeaturedSlots = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuperadmin(context.session.user.id)

    return await db
      .select({
        id: featuredSlot.id,
        scope: featuredSlot.scope,
        stateId: featuredSlot.stateId,
        stateName: state.name,
        town: featuredSlot.town,
        centerId: featuredSlot.dialysisCenterId,
        centerName: dialysisCenter.dialysisCenterName,
        startsAt: featuredSlot.startsAt,
        endsAt: featuredSlot.endsAt,
      })
      .from(featuredSlot)
      .innerJoin(dialysisCenter, eq(featuredSlot.dialysisCenterId, dialysisCenter.id))
      .leftJoin(state, eq(featuredSlot.stateId, state.id))
      .orderBy(desc(featuredSlot.startsAt))
  })

export type FeaturedSlotRow = Awaited<ReturnType<typeof getFeaturedSlots>>[number]

const CreateFeaturedSlotSchema = z.object({
  scope: z.enum(["town", "state"]),
  stateId: z.string().min(1),
  town: z.string(),
  dialysisCenterId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
})

export const createFeaturedSlot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(CreateFeaturedSlotSchema)
  .handler(async ({ context, data }) => {
    await requireSuperadmin(context.session.user.id)

    const town = data.scope === "town" ? data.town.trim() : ""
    const startsAt = toDbDate(Math.max(Date.parse(data.startsAt), Date.now()))
    const endsAt = toDbDate(Date.parse(data.endsAt))

    if (data.scope === "town" && !town) {
      throw new Error("Pick a town")
    }
    if (endsAt <= startsAt) {
      throw new Error("End date must be after the start date")
    }

    const [center] = await db
      .select({
        stateId: dialysisCenter.stateId,
        stateName: state.name,
        town: dialysisCenter.town,
        address: dialysisCenter.address,
        addressWithUnit: dialysisCenter.addressWithUnit,
        plan: dialysisCenter.plan,
        planEndsAt: dialysisCenter.planEndsAt,
      })
      .from(dialysisCenter)
      .leftJoin(state, eq(dialysisCenter.stateId, state.id))
      .where(eq(dialysisCenter.id, data.dialysisCenterId))
      .limit(1)

    if (!center) {
      throw new Error("Center not found")
    }
    if (town && !citiesForState(center.stateName ?? "").includes(town)) {
      throw new Error("Pick a town from the public town pages")
    }
    if (center.stateId !== data.stateId || (town && !isCenterInTown(center, town))) {
      throw new Error("Center is not in this location")
    }

    const [overlap] = await db
      .select({ name: dialysisCenter.dialysisCenterName })
      .from(featuredSlot)
      .innerJoin(dialysisCenter, eq(featuredSlot.dialysisCenterId, dialysisCenter.id))
      .where(
        and(
          eq(featuredSlot.scope, data.scope),
          eq(featuredSlot.stateId, data.stateId),
          sql`lower(${featuredSlot.town}) = lower(${town})`,
          lt(featuredSlot.startsAt, endsAt),
          gt(featuredSlot.endsAt, startsAt)
        )
      )
      .limit(1)

    if (overlap) {
      throw new Error(`${overlap.name} already holds this slot for those dates`)
    }

    await db.insert(featuredSlot).values({
      id: crypto.randomUUID(),
      scope: data.scope,
      stateId: data.stateId,
      town,
      dialysisCenterId: data.dialysisCenterId,
      startsAt,
      endsAt,
      createdAt: toDbDate(Date.now()),
      updatedAt: toDbDate(Date.now()),
    })

    const keepsPlanEnd =
      center.plan === "pro" &&
      (!center.planEndsAt || Date.parse(center.planEndsAt) >= Date.parse(endsAt))

    await db
      .update(dialysisCenter)
      .set({
        plan: "pro",
        planEndsAt: keepsPlanEnd ? center.planEndsAt : endsAt,
        updatedAt: new Date(),
      })
      .where(eq(dialysisCenter.id, data.dialysisCenterId))

    await revalidateCenter(data.dialysisCenterId)

    return { success: true }
  })

export const endFeaturedSlot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await requireSuperadmin(context.session.user.id)

    const [slot] = await db
      .select()
      .from(featuredSlot)
      .where(eq(featuredSlot.id, data.id))
      .limit(1)

    if (!slot) {
      throw new Error("Slot not found")
    }

    const now = Date.now()
    if (Date.parse(slot.endsAt) <= now) {
      throw new Error("Slot has already ended")
    }

    if (Date.parse(slot.startsAt) > now) {
      await db.delete(featuredSlot).where(eq(featuredSlot.id, data.id))
    } else {
      await db
        .update(featuredSlot)
        .set({ endsAt: toDbDate(now), updatedAt: toDbDate(now) })
        .where(eq(featuredSlot.id, data.id))
    }

    await revalidateCenter(slot.dialysisCenterId)

    return { success: true }
  })
