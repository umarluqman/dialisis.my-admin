import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/db/connection"
import { centerImage, dialysisCenter } from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"
import { requireCenterAccess, requireProCenterAccess } from "@/lib/access"
import { toDbDate } from "@/lib/analytics"
import { deleteS3Object, getPublicS3Url, putS3Object } from "@/lib/s3"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const getCenterImages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ centerId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await requireCenterAccess(context.session.user.id, data.centerId)

    return await db
      .select({ id: centerImage.id, url: centerImage.url, s3Key: centerImage.s3Key })
      .from(centerImage)
      .where(eq(centerImage.dialysisCenterId, data.centerId))
      .orderBy(asc(centerImage.displayOrder))
  })

export const uploadCenterImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data) => {
    if (!(data instanceof FormData)) throw new Error("Invalid upload")
    const centerId = data.get("centerId")
    const file = data.get("image")
    if (typeof centerId !== "string" || !centerId) throw new Error("Missing centre")
    if (!(file instanceof File) || file.type !== "image/jpeg") {
      throw new Error("Image must be a JPEG")
    }
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Image is too large")
    return { centerId, file }
  })
  .handler(async ({ context, data }) => {
    await requireProCenterAccess(context.session.user.id, data.centerId)

    const [center] = await db
      .select({ name: dialysisCenter.dialysisCenterName })
      .from(dialysisCenter)
      .where(eq(dialysisCenter.id, data.centerId))
      .limit(1)
    if (!center) throw new Error("Center not found")

    const id = crypto.randomUUID()
    const s3Key = `dialysis-centers/${data.centerId}/${id}.jpg`
    await putS3Object(s3Key, await data.file.arrayBuffer(), "image/jpeg")

    const [last] = await db
      .select({ displayOrder: centerImage.displayOrder })
      .from(centerImage)
      .where(eq(centerImage.dialysisCenterId, data.centerId))
      .orderBy(desc(centerImage.displayOrder))
      .limit(1)
    const nextOrder = (last?.displayOrder ?? 0) + 1

    const now = toDbDate(Date.now())
    await db.insert(centerImage).values({
      id,
      url: getPublicS3Url(s3Key),
      s3Key,
      altText: `${center.name} - Gallery Image`,
      displayOrder: nextOrder,
      dialysisCenterId: data.centerId,
      createdAt: now,
      updatedAt: now,
    })

    return { id }
  })

export const deleteCenterImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ imageId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    const [image] = await db
      .select()
      .from(centerImage)
      .where(eq(centerImage.id, data.imageId))
      .limit(1)
    if (!image) throw new Error("Image not found")

    await requireProCenterAccess(context.session.user.id, image.dialysisCenterId)

    await deleteS3Object(image.s3Key)
    await db.delete(centerImage).where(eq(centerImage.id, image.id))

    return { success: true }
  })

export const reorderCenterImages = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      centerId: z.string().min(1),
      imageIds: z.array(z.string().min(1)).min(1),
    })
  )
  .handler(async ({ context, data }) => {
    await requireProCenterAccess(context.session.user.id, data.centerId)

    const owned = await db
      .select({ id: centerImage.id })
      .from(centerImage)
      .where(
        and(
          eq(centerImage.dialysisCenterId, data.centerId),
          inArray(centerImage.id, data.imageIds)
        )
      )
    if (owned.length !== data.imageIds.length) throw new Error("Image not found")

    const now = toDbDate(Date.now())
    await Promise.all(
      data.imageIds.map((id, index) =>
        db
          .update(centerImage)
          .set({ displayOrder: index + 1, updatedAt: now })
          .where(eq(centerImage.id, id))
      )
    )

    return { success: true }
  })
