import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { eq, and, inArray, ne, count, lte, gt } from "drizzle-orm"
import { db } from "@/db/connection"
import {
  dialysisCenter,
  state,
  centerImage,
  featuredSlot,
} from "@/db/schema"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { authMiddleware } from "@/lib/middleware"
import {
  getPublicCenterSnapshot,
  requireSuperadmin,
  revalidateCenter,
  revalidatePublicCenterChange,
} from "@/lib/center-admin"
import {
  extractGoogleMapsCoordinates,
  extractGoogleMapsUrl,
} from "@/lib/google-maps-embed"
import { getAccess, isProCenter, requireCenterAccess } from "@/lib/access"
import { toDbDate } from "@/lib/analytics"
import { EARLYBIRD_SEATS } from "@/lib/plan"

function slugifyCenterName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function generateUniqueCenterSlug(name: string) {
  const baseSlug = slugifyCenterName(name) || crypto.randomUUID()
  let slug = baseSlug
  let suffix = 2

  while (true) {
    const [existingCenter] = await db
      .select({ id: dialysisCenter.id })
      .from(dialysisCenter)
      .where(eq(dialysisCenter.slug, slug))
      .limit(1)

    if (!existingCenter) {
      return slug
    }

    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

export const getCurrentUserRole = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { role, preview } = await getAccess(context.session.user.id)
    return {
      role,
      preview: preview && { label: preview.label, centers: preview.centerIds.length },
    }
  })

const ResolveGoogleMapsCoordinatesSchema = z.object({
  value: z.string().trim().min(1).max(10000),
})

function isAllowedGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()

    if (hostname === "maps.app.goo.gl") return true
    if (hostname === "goo.gl") return url.pathname.startsWith("/maps")
    if (hostname === "maps.google.com") return true
    if (hostname === "www.google.com" || hostname === "google.com") {
      return url.pathname.startsWith("/maps")
    }
  } catch {
    return false
  }

  return false
}

export const resolveGoogleMapsCoordinates = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(ResolveGoogleMapsCoordinatesSchema)
  .handler(async ({ data }) => {
    const directCoordinates = extractGoogleMapsCoordinates(data.value)
    if (directCoordinates) {
      return { coordinates: directCoordinates }
    }

    const url = extractGoogleMapsUrl(data.value)
    if (!url || !isAllowedGoogleMapsUrl(url)) {
      return { coordinates: null }
    }

    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    })

    const coordinates = extractGoogleMapsCoordinates(response.url)
    return { coordinates }
  })

export const getCentersForUser = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { centerIds: accessibleCenterIds } = await getAccess(context.session.user.id)
    await ensureAdminDatabaseSchema()

    const centersData = await db
      .select()
      .from(dialysisCenter)
      .leftJoin(state, eq(dialysisCenter.stateId, state.id))
      .where(
        accessibleCenterIds
          ? inArray(dialysisCenter.id, accessibleCenterIds)
          : undefined
      )
      .orderBy(dialysisCenter.dialysisCenterName)

    const centerIds = centersData.map((row) => row.DialysisCenter.id)

    const now = toDbDate(Date.now())
    const [images, activeSlots] =
      centerIds.length > 0
        ? await Promise.all([
            db
              .select()
              .from(centerImage)
              .where(
                and(
                  eq(centerImage.isActive, true),
                  inArray(centerImage.dialysisCenterId, centerIds)
                )
              )
              .orderBy(centerImage.displayOrder),
            db
              .select({ centerId: featuredSlot.dialysisCenterId })
              .from(featuredSlot)
              .where(
                and(
                  inArray(featuredSlot.dialysisCenterId, centerIds),
                  lte(featuredSlot.startsAt, now),
                  gt(featuredSlot.endsAt, now)
                )
              ),
          ])
        : [[], []]
    const featuredIds = new Set(activeSlots.map((slot) => slot.centerId))

    return centersData.map((row) => ({
      ...row.DialysisCenter,
      featuredNow: featuredIds.has(row.DialysisCenter.id),
      state: row.State,
      images: images.filter(
        (img) => img.dialysisCenterId === row.DialysisCenter.id
      ),
    }))
  })

const GetCenterByIdSchema = z.object({
  id: z.string().min(1),
})

export const getCenterById = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(GetCenterByIdSchema)
  .handler(async ({ context, data }) => {
    await requireCenterAccess(context.session.user.id, data.id)
    await ensureAdminDatabaseSchema()

    const [center] = await db
      .select()
      .from(dialysisCenter)
      .leftJoin(state, eq(dialysisCenter.stateId, state.id))
      .where(eq(dialysisCenter.id, data.id))
      .limit(1)

    if (!center) {
      throw new Error("Center not found")
    }

    const images = await db
      .select()
      .from(centerImage)
      .where(eq(centerImage.dialysisCenterId, data.id))
      .orderBy(centerImage.displayOrder)

    return {
      ...center.DialysisCenter,
      state: center.State,
      images,
    }
  })

const CreateCenterSchema = z.object({
  dialysisCenterName: z.string().trim().min(1),
  sector: z.string(),
  description: z.string(),
  phoneNumber: z.string(),
  email: z.string(),
  website: z.string(),
  address: z.string(),
  googleMapsEmbed: z.string().default(""),
  longitude: z.number().nullable().optional(),
  latitude: z.number().nullable().optional(),
  town: z.string(),
  stateId: z.string().trim().min(1),
  drInCharge: z.string(),
  drInChargeTel: z.string(),
  panelNephrologist: z.string(),
  centreManager: z.string(),
  centreCoordinator: z.string(),
  units: z.string(),
  hepatitisBay: z.string(),
  benefits: z.string(),
  highlights: z.string().default(""),
  sessionSlots: z.string().default(""),
  perkesoPanel: z.boolean().default(false),
  whatsappPicName: z.string().default(""),
  whatsappPicPhoneNumber: z.string().default(""),
})

export const createCenter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(CreateCenterSchema)
  .handler(async ({ context, data }) => {
    const { role } = await getAccess(context.session.user.id)
    await ensureAdminDatabaseSchema()

    if (role !== "superadmin") {
      throw new Error("Only superadmins can create centers")
    }

    const id = crypto.randomUUID()
    const slug = await generateUniqueCenterSlug(data.dialysisCenterName)

    await db.insert(dialysisCenter).values({
      id,
      slug,
      dialysisCenterName: data.dialysisCenterName,
      title: data.dialysisCenterName,
      sector: data.sector,
      description: data.description,
      tel: data.phoneNumber,
      phoneNumber: data.phoneNumber,
      email: data.email,
      website: data.website,
      address: data.address,
      addressWithUnit: data.address,
      googleMapsEmbed: data.googleMapsEmbed.trim() || null,
      longitude: data.longitude ?? null,
      latitude: data.latitude ?? null,
      town: data.town,
      stateId: data.stateId,
      drInCharge: data.drInCharge,
      drInChargeTel: data.drInChargeTel,
      panelNephrologist: data.panelNephrologist,
      centreManager: data.centreManager,
      centreCoordinator: data.centreCoordinator,
      units: data.units,
      hepatitisBay: data.hepatitisBay,
      benefits: data.benefits,
      highlights: data.highlights.trim() || null,
      sessionSlots: data.sessionSlots.trim() || null,
      perkesoPanel: data.perkesoPanel,
      whatsappPicName: data.whatsappPicName.trim() || null,
      whatsappPicPhoneNumber: data.whatsappPicPhoneNumber.trim() || null,
    })

    const createdCenter = await getPublicCenterSnapshot(id)
    await revalidatePublicCenterChange({ after: createdCenter })

    return { id }
  })

const UpdateCenterSchema = z.object({
  id: z.string().min(1),
  data: z.object({
    dialysisCenterName: z.string().optional(),
    sector: z.string().optional(),
    drInCharge: z.string().optional(),
    drInChargeTel: z.string().optional(),
    address: z.string().optional(),
    panelNephrologist: z.string().nullable().optional(),
    centreManager: z.string().nullable().optional(),
    centreCoordinator: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    hepatitisBay: z.string().nullable().optional(),
    longitude: z.number().nullable().optional(),
    latitude: z.number().nullable().optional(),
    googleMapsEmbed: z.string().nullable().optional(),
    phoneNumber: z.string().optional(),
    website: z.string().nullable().optional(),
    units: z.string().optional(),
    description: z.string().nullable().optional(),
    benefits: z.string().nullable().optional(),
    highlights: z.string().nullable().optional(),
    town: z.string().optional(),
    stateId: z.string().min(1).optional(),
    sessionSlots: z.string().nullable().optional(),
    perkesoPanel: z.boolean().optional(),
    whatsappPicName: z.string().nullable().optional(),
    whatsappPicPhoneNumber: z.string().nullable().optional(),
  }),
})

export const updateCenter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(UpdateCenterSchema)
  .handler(async ({ context, data }) => {
    await requireCenterAccess(context.session.user.id, data.id)
    await ensureAdminDatabaseSchema()

    const beforeCenter = await getPublicCenterSnapshot(data.id)

    const updateData: Partial<typeof dialysisCenter.$inferInsert> = {
      ...data.data,
    }
    if (
      (updateData.benefits !== undefined || updateData.highlights !== undefined) &&
      (await getAccess(context.session.user.id)).role === "pic" &&
      !(await isProCenter(data.id))
    ) {
      delete updateData.benefits
      delete updateData.highlights
    }
    if (data.data.dialysisCenterName !== undefined) updateData.title = data.data.dialysisCenterName
    if (data.data.phoneNumber !== undefined) updateData.tel = data.data.phoneNumber
    if (data.data.address !== undefined) updateData.addressWithUnit = data.data.address

    for (const key of [
      "googleMapsEmbed",
      "sessionSlots",
    ] as const) {
      if (key in updateData) {
        updateData[key] = updateData[key]?.trim() || null
      }
    }

    await db
      .update(dialysisCenter)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(dialysisCenter.id, data.id))

    const afterCenter = await getPublicCenterSnapshot(data.id)
    await revalidatePublicCenterChange({
      before: beforeCenter,
      after: afterCenter,
    })

    return { success: true }
  })

export const getStates = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    return await db.select().from(state).orderBy(state.name)
  })

const DeleteCenterSchema = z.object({
  id: z.string().min(1),
})

export const deleteCenter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(DeleteCenterSchema)
  .handler(async ({ context, data }) => {
    await requireCenterAccess(context.session.user.id, data.id)
    await ensureAdminDatabaseSchema()

    const beforeCenter = await getPublicCenterSnapshot(data.id)

    if (!beforeCenter) {
      throw new Error("Center not found")
    }

    await db.delete(dialysisCenter).where(eq(dialysisCenter.id, data.id))

    await revalidatePublicCenterChange({ before: beforeCenter })

    return { success: true }
  })

async function countEarlybirdSeats(excludeCenterId?: string) {
  const [row] = await db
    .select({ used: count() })
    .from(dialysisCenter)
    .where(
      and(
        eq(dialysisCenter.earlybird, true),
        excludeCenterId ? ne(dialysisCenter.id, excludeCenterId) : undefined
      )
    )
  return row.used
}

export const getEarlybirdSeats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuperadmin(context.session.user.id)
    return { used: await countEarlybirdSeats(), total: EARLYBIRD_SEATS }
  })

const UpdateCenterPlanSchema = z.object({
  id: z.string().min(1),
  plan: z.enum(["asas", "pro"]),
  planEndsAt: z.string().nullable(),
  earlybird: z.boolean(),
  verified: z.boolean(),
})

export const updateCenterPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(UpdateCenterPlanSchema)
  .handler(async ({ context, data }) => {
    await requireSuperadmin(context.session.user.id)

    const [center] = await db
      .select({
        earlybird: dialysisCenter.earlybird,
        verifiedAt: dialysisCenter.verifiedAt,
      })
      .from(dialysisCenter)
      .where(eq(dialysisCenter.id, data.id))
      .limit(1)

    if (!center) {
      throw new Error("Center not found")
    }

    if (
      data.earlybird &&
      !center.earlybird &&
      (await countEarlybirdSeats(data.id)) >= EARLYBIRD_SEATS
    ) {
      throw new Error(`All ${EARLYBIRD_SEATS} earlybird seats are taken`)
    }

    await db
      .update(dialysisCenter)
      .set({
        plan: data.plan,
        planEndsAt: data.planEndsAt,
        earlybird: data.earlybird,
        verifiedAt: data.verified
          ? (center.verifiedAt ?? toDbDate(Date.now()))
          : null,
        updatedAt: new Date(),
      })
      .where(eq(dialysisCenter.id, data.id))

    await revalidateCenter(data.id)

    return { success: true }
  })
