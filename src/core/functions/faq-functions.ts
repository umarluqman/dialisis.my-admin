import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { eq, and, asc } from "drizzle-orm"
import { db } from "@/db/connection"
import { centerFaq, userCenterAccess, user } from "@/db/schema"
import { authMiddleware } from "@/lib/middleware"

async function getUserRole(userId: string) {
  const [userData] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return userData?.role ?? "pic"
}

async function checkCenterAccess(userId: string, centerId: string) {
  const role = await getUserRole(userId)
  if (role === "superadmin") return

  const [access] = await db
    .select()
    .from(userCenterAccess)
    .where(
      and(
        eq(userCenterAccess.userId, userId),
        eq(userCenterAccess.dialysisCenterId, centerId)
      )
    )
    .limit(1)

  if (!access) throw new Error("Access denied")
}

export const getFaqsForCenter = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ centerId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await checkCenterAccess(context.session.user.id, data.centerId)

    return await db
      .select()
      .from(centerFaq)
      .where(eq(centerFaq.dialysisCenterId, data.centerId))
      .orderBy(asc(centerFaq.displayOrder))
  })

export const createFaq = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      centerId: z.string().min(1),
      question: z.string().min(1),
      answer: z.string().min(1),
    })
  )
  .handler(async ({ context, data }) => {
    await checkCenterAccess(context.session.user.id, data.centerId)

    const existing = await db
      .select({ displayOrder: centerFaq.displayOrder })
      .from(centerFaq)
      .where(eq(centerFaq.dialysisCenterId, data.centerId))
      .orderBy(asc(centerFaq.displayOrder))

    const nextOrder = existing.length > 0
      ? Math.max(...existing.map((f) => f.displayOrder)) + 1
      : 0

    const id = crypto.randomUUID()
    await db.insert(centerFaq).values({
      id,
      question: data.question,
      answer: data.answer,
      displayOrder: nextOrder,
      dialysisCenterId: data.centerId,
    })

    return { id }
  })

export const updateFaq = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      faqId: z.string().min(1),
      question: z.string().min(1).optional(),
      answer: z.string().min(1).optional(),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    })
  )
  .handler(async ({ context, data }) => {
    const [faq] = await db
      .select()
      .from(centerFaq)
      .where(eq(centerFaq.id, data.faqId))
      .limit(1)

    if (!faq) throw new Error("FAQ not found")

    await checkCenterAccess(context.session.user.id, faq.dialysisCenterId)

    const { faqId, ...updateData } = data
    await db
      .update(centerFaq)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(centerFaq.id, faqId))

    return { success: true }
  })

export const deleteFaq = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ faqId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    const [faq] = await db
      .select()
      .from(centerFaq)
      .where(eq(centerFaq.id, data.faqId))
      .limit(1)

    if (!faq) throw new Error("FAQ not found")

    await checkCenterAccess(context.session.user.id, faq.dialysisCenterId)

    await db.delete(centerFaq).where(eq(centerFaq.id, data.faqId))

    return { success: true }
  })
