import { eq } from "drizzle-orm"
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server"
import { z } from "zod"
import { db } from "@/db/connection"
import { userCenterAccess } from "@/db/schema"
import { getUserRole } from "@/lib/user-role"

// Lets a superadmin see the dashboard exactly as a PIC of these centres would.
const PREVIEW_COOKIE = "pic_preview"
const PREVIEW_MAX_AGE = 4 * 60 * 60

const previewSchema = z.object({
  label: z.string(),
  centerIds: z.array(z.string()).min(1),
})
export type Preview = z.infer<typeof previewSchema>

export function readPreview(): Preview | null {
  const raw = getCookie(PREVIEW_COOKIE)
  if (!raw) return null
  try {
    const parsed = previewSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function writePreview(preview: Preview) {
  setCookie(PREVIEW_COOKIE, JSON.stringify(preview), {
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    path: "/",
    maxAge: PREVIEW_MAX_AGE,
  })
}

export function clearPreview() {
  deleteCookie(PREVIEW_COOKIE, { path: "/" })
}

export type Access =
  | { role: "superadmin"; preview: null; centerIds: null }
  | { role: "pic"; preview: Preview | null; centerIds: string[] }

export async function getAccess(userId: string): Promise<Access> {
  if ((await getUserRole(userId)) === "superadmin") {
    const preview = readPreview()
    return preview
      ? { role: "pic", preview, centerIds: preview.centerIds }
      : { role: "superadmin", preview: null, centerIds: null }
  }

  const rows = await db
    .select({ centerId: userCenterAccess.dialysisCenterId })
    .from(userCenterAccess)
    .where(eq(userCenterAccess.userId, userId))

  return { role: "pic", preview: null, centerIds: rows.map((row) => row.centerId) }
}

export async function requireCenterAccess(userId: string, centerId: string) {
  const { centerIds } = await getAccess(userId)
  if (centerIds && !centerIds.includes(centerId)) {
    throw new Error("Access denied")
  }
}
