import { and, eq } from "drizzle-orm"
import { db } from "@/db/connection"
import { town } from "@/db/schema"

// Same slug rule as dialisis.my createLocationSlug, so /lokasi/{state}/{slug} resolves.
export function townSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function requireTownInState(townId: string, stateId: string) {
  const [row] = await db
    .select({ name: town.name })
    .from(town)
    .where(and(eq(town.id, townId), eq(town.stateId, stateId)))
    .limit(1)
  if (!row) {
    throw new Error("Town is not in this state")
  }
  return row
}
