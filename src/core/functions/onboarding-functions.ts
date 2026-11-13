import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/db/connection"
import { user } from "@/db/schema"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { authMiddleware } from "@/lib/middleware"

export const getOnboarding = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureAdminDatabaseSchema()
    const [row] = await db
      .select({
        seenAt: user.onboardingSeenAt,
        dismissedAt: user.onboardingDismissedAt,
      })
      .from(user)
      .where(eq(user.id, context.session.user.id))
      .limit(1)

    return { seen: !!row?.seenAt, dismissed: !!row?.dismissedAt }
  })

export const updateOnboarding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ field: z.enum(["seen", "dismissed"]) }))
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()
    await db
      .update(user)
      .set(
        data.field === "seen"
          ? { onboardingSeenAt: new Date() }
          : { onboardingDismissedAt: new Date() }
      )
      .where(eq(user.id, context.session.user.id))

    return { success: true }
  })
