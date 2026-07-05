import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { eq, and, inArray } from "drizzle-orm"
import { db } from "@/db/connection"
import {
  dialysisCenter,
  userCenterAccess,
  state,
  centerImage,
} from "@/db/schema"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { authMiddleware } from "@/lib/middleware"
import {
  revalidatePublicCenterQuietly,
  type PublicCenterRevalidationInput,
} from "@/lib/public-site-revalidation"
import { getUserRole } from "@/lib/user-role"

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

type PublicCenterSnapshot = {
  slug: string
  town: string
  stateName: string | null
}

async function getPublicCenterSnapshot(
  id: string
): Promise<PublicCenterSnapshot | undefined> {
  const [center] = await db
    .select({
      slug: dialysisCenter.slug,
      town: dialysisCenter.town,
      stateName: state.name,
    })
    .from(dialysisCenter)
    .leftJoin(state, eq(dialysisCenter.stateId, state.id))
    .where(eq(dialysisCenter.id, id))
    .limit(1)

  return center
}

async function revalidatePublicCenterChange({
  before,
  after,
}: {
  before?: PublicCenterSnapshot
  after?: PublicCenterSnapshot
}) {
  const center = after ?? before

  if (!center) return

  const payload: PublicCenterRevalidationInput = {
    slug: after?.slug ?? before?.slug,
    oldSlug: before?.slug,
    stateName: after?.stateName,
    town: after?.town,
    oldStateName: before?.stateName,
    oldTown: before?.town,
  }

  await revalidatePublicCenterQuietly(payload)
}

export const getCurrentUserRole = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { session } = context
    const role = await getUserRole(session.user.id)
    return { role }
  })

export const getCentersForUser = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { session } = context
    const userId = session.user.id
    const userRole = await getUserRole(userId)
    await ensureAdminDatabaseSchema()

    let centersData
    if (userRole === "superadmin") {
      centersData = await db
        .select()
        .from(dialysisCenter)
        .leftJoin(state, eq(dialysisCenter.stateId, state.id))
        .orderBy(dialysisCenter.dialysisCenterName)
    } else {
      centersData = await db
        .select()
        .from(userCenterAccess)
        .innerJoin(
          dialysisCenter,
          eq(userCenterAccess.dialysisCenterId, dialysisCenter.id)
        )
        .leftJoin(state, eq(dialysisCenter.stateId, state.id))
        .where(eq(userCenterAccess.userId, userId))
        .orderBy(dialysisCenter.dialysisCenterName)
    }

    const centerIds = centersData.map((row) => row.DialysisCenter.id)

    const images =
      centerIds.length > 0
        ? await db
            .select()
            .from(centerImage)
            .where(
              and(
                eq(centerImage.isActive, true),
                inArray(centerImage.dialysisCenterId, centerIds)
              )
            )
            .orderBy(centerImage.displayOrder)
        : []

    return centersData.map((row) => ({
      ...row.DialysisCenter,
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
    const { session } = context
    const userId = session.user.id
    const userRole = await getUserRole(userId)
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

    if (userRole !== "superadmin") {
      const [access] = await db
        .select()
        .from(userCenterAccess)
        .where(
          and(
            eq(userCenterAccess.userId, userId),
            eq(userCenterAccess.dialysisCenterId, data.id)
          )
        )
        .limit(1)

      if (!access) {
        throw new Error("Access denied")
      }
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
  title: z.string(),
  sector: z.string(),
  description: z.string(),
  tel: z.string(),
  phoneNumber: z.string(),
  fax: z.string(),
  email: z.string(),
  website: z.string(),
  address: z.string(),
  addressWithUnit: z.string(),
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
  featured: z.boolean().default(false),
  whatsappPicName: z.string().default(""),
  whatsappPicPhoneNumber: z.string().default(""),
})

export const createCenter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(CreateCenterSchema)
  .handler(async ({ context, data }) => {
    const { session } = context
    const userRole = await getUserRole(session.user.id)
    await ensureAdminDatabaseSchema()

    if (userRole !== "superadmin") {
      throw new Error("Only superadmins can create centers")
    }

    const id = crypto.randomUUID()
    const slug = await generateUniqueCenterSlug(data.dialysisCenterName)

    await db.insert(dialysisCenter).values({
      id,
      slug,
      dialysisCenterName: data.dialysisCenterName,
      title: data.title,
      sector: data.sector,
      description: data.description,
      tel: data.tel,
      phoneNumber: data.phoneNumber,
      fax: data.fax,
      email: data.email,
      website: data.website,
      address: data.address,
      addressWithUnit: data.addressWithUnit,
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
      featured: data.featured,
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
    addressWithUnit: z.string().optional(),
    tel: z.string().optional(),
    fax: z.string().nullable().optional(),
    panelNephrologist: z.string().nullable().optional(),
    centreManager: z.string().nullable().optional(),
    centreCoordinator: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    hepatitisBay: z.string().nullable().optional(),
    longitude: z.number().nullable().optional(),
    latitude: z.number().nullable().optional(),
    phoneNumber: z.string().optional(),
    website: z.string().nullable().optional(),
    title: z.string().optional(),
    units: z.string().optional(),
    description: z.string().nullable().optional(),
    benefits: z.string().nullable().optional(),
    town: z.string().optional(),
    stateId: z.string().min(1).optional(),
    featured: z.boolean().optional(),
    whatsappPicName: z.string().nullable().optional(),
    whatsappPicPhoneNumber: z.string().nullable().optional(),
  }),
})

export const updateCenter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(UpdateCenterSchema)
  .handler(async ({ context, data }) => {
    const { session } = context
    const userId = session.user.id
    const userRole = await getUserRole(userId)
    await ensureAdminDatabaseSchema()

    if (userRole !== "superadmin") {
      const [access] = await db
        .select()
        .from(userCenterAccess)
        .where(
          and(
            eq(userCenterAccess.userId, userId),
            eq(userCenterAccess.dialysisCenterId, data.id)
          )
        )
        .limit(1)

      if (!access) {
        throw new Error("Access denied")
      }
    }

    const beforeCenter = await getPublicCenterSnapshot(data.id)

    const updateData: Partial<typeof dialysisCenter.$inferInsert> = {
      ...data.data,
    }

    if (userRole !== "superadmin") {
      delete updateData.featured
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
