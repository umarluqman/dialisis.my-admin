import { eq } from "drizzle-orm"
import { db } from "@/db/connection"
import { company, dialysisCenter, state } from "@/db/schema"
import {
  revalidatePublicCenterQuietly,
  type PublicCenterRevalidationInput,
} from "@/lib/public-site-revalidation"
import { getAccess } from "@/lib/access"

type PublicCenterSnapshot = {
  slug: string
  town: string
  stateName: string | null
  companySlug: string | null
}

export async function getPublicCenterSnapshot(
  id: string
): Promise<PublicCenterSnapshot | undefined> {
  const [center] = await db
    .select({
      slug: dialysisCenter.slug,
      town: dialysisCenter.town,
      stateName: state.name,
      companySlug: company.slug,
    })
    .from(dialysisCenter)
    .leftJoin(state, eq(dialysisCenter.stateId, state.id))
    .leftJoin(company, eq(dialysisCenter.companyId, company.id))
    .where(eq(dialysisCenter.id, id))
    .limit(1)

  return center
}

export async function revalidatePublicCenterChange({
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
    companySlug: after?.companySlug,
    oldCompanySlug: before?.companySlug,
  }

  await revalidatePublicCenterQuietly(payload)
}

export async function revalidateCenter(id: string) {
  const snapshot = await getPublicCenterSnapshot(id)
  await revalidatePublicCenterChange({ before: snapshot, after: snapshot })
}

export async function requireSuperadmin(userId: string) {
  if ((await getAccess(userId)).role !== "superadmin") {
    throw new Error("Superadmin only")
  }
}
