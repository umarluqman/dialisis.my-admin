import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/db/connection"
import {
  invitation,
  user,
  userCenterAccess,
  dialysisCenter,
  state,
} from "@/db/schema"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { authMiddleware } from "@/lib/middleware"
import { getUserRole } from "@/lib/user-role"

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let token = ""
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function generateId(): string {
  return crypto.randomUUID()
}

const CreateInvitationSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  centerIds: z.array(z.string()).min(1),
  expiresInDays: z.number().min(1).max(30).default(7),
})

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(CreateInvitationSchema)
  .handler(async ({ context, data }) => {
    const { session } = context
    const userId = session.user.id
    const userRole = await getUserRole(userId)
    await ensureAdminDatabaseSchema()

    if (userRole !== "superadmin") {
      throw new Error("Only superadmins can create invitations")
    }

    const token = generateToken()
    const expiresAt = new Date(
      Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000
    )

    await db.insert(invitation).values({
      id: generateId(),
      token,
      email: data.email,
      centerIds: JSON.stringify(data.centerIds),
      expiresAt,
      createdBy: userId,
    })

    return { token }
  })

export const getAllCenters = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { session } = context
    const userId = session.user.id
    const userRole = await getUserRole(userId)
    await ensureAdminDatabaseSchema()

    if (userRole !== "superadmin") {
      throw new Error("Only superadmins can view all centers")
    }

    const centers = await db
      .select({
        id: dialysisCenter.id,
        dialysisCenterName: dialysisCenter.dialysisCenterName,
        town: dialysisCenter.town,
        stateName: state.name,
      })
      .from(dialysisCenter)
      .leftJoin(state, eq(dialysisCenter.stateId, state.id))
      .orderBy(dialysisCenter.dialysisCenterName)

    return centers
  })

const GetInvitationSchema = z.object({
  token: z.string().min(1),
})

export const getInvitationByToken = createServerFn({ method: "GET" })
  .inputValidator(GetInvitationSchema)
  .handler(async ({ data }) => {
    await ensureAdminDatabaseSchema()

    const [inv] = await db
      .select()
      .from(invitation)
      .where(eq(invitation.token, data.token))
      .limit(1)

    if (!inv) {
      throw new Error("Invalid invitation")
    }

    if (inv.used) {
      throw new Error("Invitation already used")
    }

    if (new Date(inv.expiresAt) < new Date()) {
      throw new Error("Invitation expired")
    }

    const centerIds = JSON.parse(inv.centerIds) as string[]

    const allCenters = await Promise.all(
      centerIds.map(async (centerId) => {
        const [center] = await db
          .select({
            id: dialysisCenter.id,
            dialysisCenterName: dialysisCenter.dialysisCenterName,
            town: dialysisCenter.town,
            stateName: state.name,
          })
          .from(dialysisCenter)
          .leftJoin(state, eq(dialysisCenter.stateId, state.id))
          .where(eq(dialysisCenter.id, centerId))
          .limit(1)
        return center
      })
    )

    return {
      token: inv.token,
      email: inv.email,
      expiresAt: inv.expiresAt,
      centers: allCenters.filter(Boolean),
    }
  })

const ConsumeInvitationSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
})

export const consumeInvitation = createServerFn({ method: "POST" })
  .inputValidator(ConsumeInvitationSchema)
  .handler(async ({ data }) => {
    await ensureAdminDatabaseSchema()

    const [inv] = await db
      .select()
      .from(invitation)
      .where(eq(invitation.token, data.token))
      .limit(1)

    if (!inv) {
      throw new Error("Invalid invitation")
    }

    if (inv.used) {
      throw new Error("Invitation already used")
    }

    if (new Date(inv.expiresAt) < new Date()) {
      throw new Error("Invitation expired")
    }

    const [authUser] = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, data.userId))
      .limit(1)

    if (!authUser) {
      throw new Error("User not found")
    }

    if (inv.email && authUser.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw new Error("Invitation email does not match signed-in user")
    }

    const centerIds = JSON.parse(inv.centerIds) as string[]

    for (const centerId of centerIds) {
      await db.insert(userCenterAccess).values({
        id: generateId(),
        userId: data.userId,
        dialysisCenterId: centerId,
      })
    }

    await db
      .update(invitation)
      .set({ used: true, usedBy: data.userId })
      .where(eq(invitation.id, inv.id))

    await db
      .update(user)
      .set({
        ...(data.name ? { name: data.name } : {}),
        role: "pic",
      })
      .where(eq(user.id, data.userId))

    return { success: true, assignedCenters: centerIds.length }
  })
