import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db/connection"
import { dialysisCenter, salesProspect, salesProspectCenter } from "@/db/schema"
import { SALES_STAGES } from "@/lib/sales"
import { toMytDay } from "@/lib/analytics"
import { getPublicS3Url, putS3Object } from "@/lib/s3"
import { getZohoMailConfig, sendZohoEmail } from "@/lib/zoho-mail"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { authMiddleware } from "@/lib/middleware"
import { requireSuperadmin } from "@/lib/center-admin"

const MAX_OUTREACH_IMAGE_BYTES = 5 * 1024 * 1024
const OUTREACH_IMAGE_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const

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

export const getColdEmailConfig = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuperadmin(context.session.user.id)
    const config = getZohoMailConfig()
    return {
      zohoConfigured: config.configured,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
    }
  })

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
  email: optionalText.optional(),
  stage: z.enum(SALES_STAGES),
  lostReason: optionalText,
  notes: optionalText,
  nextFollowUpAt: z.date().nullable(),
  emailSubject: optionalText.optional(),
  emailBody: optionalText.optional(),
  emailSubjectBm: optionalText.optional(),
  emailBodyBm: optionalText.optional(),
  emailLang: z.enum(["en", "ms"]).optional(),
  emailImageUrl: optionalText.optional(),
  emailImageCaption: optionalText.optional(),
})

const STAGE_REACHED_AT = {
  contacted: "contactedAt",
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

    const { id, dialysisCenterIds, ...rawFields } = data
    const fields = Object.fromEntries(
      Object.entries(rawFields).filter(([, value]) => value !== undefined)
    ) as typeof rawFields

    const prospectId = id ?? crypto.randomUUID()
    const [existing] = id
      ? await db.select().from(salesProspect).where(eq(salesProspect.id, id)).limit(1)
      : []

    if (id && !existing) {
      throw new Error("Prospect not found")
    }

    const reachedKey = data.stage === "lead" ? null : STAGE_REACHED_AT[data.stage]
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

export const uploadOutreachImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data) => {
    if (!(data instanceof FormData)) throw new Error("Invalid upload")
    const prospectId = data.get("prospectId")
    const file = data.get("file")
    if (typeof prospectId !== "string" || !prospectId.trim()) {
      throw new Error("Missing prospect")
    }
    if (!(file instanceof File) || !(file.type in OUTREACH_IMAGE_EXT)) {
      throw new Error("Image must be JPEG, PNG, or WebP")
    }
    if (file.size > MAX_OUTREACH_IMAGE_BYTES) {
      throw new Error("Image must be 5 MB or smaller")
    }
    return {
      prospectId: prospectId.trim(),
      file,
      contentType: file.type as keyof typeof OUTREACH_IMAGE_EXT,
    }
  })
  .handler(async ({ context, data }) => {
    await requireSuperadmin(context.session.user.id)
    const ext = OUTREACH_IMAGE_EXT[data.contentType]
    const key = `outreach-emails/${data.prospectId}/${crypto.randomUUID()}.${ext}`
    await putS3Object(key, await data.file.arrayBuffer(), data.contentType)
    return { url: getPublicS3Url(key) }
  })

const SendProspectEmailSchema = z.object({
  prospectId: z.string().min(1),
  to: z.string().trim().email(),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
  lang: z.enum(["en", "ms"]),
  imageUrl: optionalText,
  imageCaption: optionalText,
  mode: z.enum(["zoho", "mark_sent"]),
})

export const sendProspectEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(SendProspectEmailSchema)
  .handler(async ({ context, data }) => {
    await requireSuperadmin(context.session.user.id)
    await ensureAdminDatabaseSchema()

    const [existing] = await db
      .select()
      .from(salesProspect)
      .where(eq(salesProspect.id, data.prospectId))
      .limit(1)

    if (!existing) {
      throw new Error("Prospect not found")
    }

    let messageId: string | undefined
    if (data.mode === "zoho") {
      const result = await sendZohoEmail({
        to: data.to,
        subject: data.subject,
        body: data.body,
        imageUrl: data.imageUrl,
        imageCaption: data.imageCaption,
      })
      messageId = result.messageId
    }

    const now = new Date()
    const followUpDay = toMytDay(now.getTime() + 3 * 86_400_000)
    const defaultFollowUp = new Date(`${followUpDay}T09:00:00+08:00`)
    const nextFollowUpAt =
      existing.nextFollowUpAt && existing.nextFollowUpAt.getTime() > defaultFollowUp.getTime()
        ? existing.nextFollowUpAt
        : defaultFollowUp

    const langFields =
      data.lang === "ms"
        ? { emailSubjectBm: data.subject, emailBodyBm: data.body }
        : { emailSubject: data.subject, emailBody: data.body }

    const stageFields =
      existing.stage === "lead"
        ? { stage: "contacted" as const, contactedAt: existing.contactedAt ?? now }
        : {}

    await db
      .update(salesProspect)
      .set({
        email: data.to,
        ...langFields,
        emailLang: data.lang,
        emailImageUrl: data.imageUrl,
        emailImageCaption: data.imageCaption,
        emailSentAt: now,
        emailStep: (existing.emailStep ?? 0) + 1,
        nextFollowUpAt,
        ...stageFields,
      })
      .where(eq(salesProspect.id, existing.id))

    return { success: true as const, mode: data.mode, messageId }
  })
