import { db } from "../src/db/connection"
import * as schema from "../src/db/schema"
import { eq } from "drizzle-orm"

const EMAIL = "umarluqman.78@gmail.com"

async function deleteSuperadmin() {
  const user = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, EMAIL),
  })

  if (!user) {
    console.error(`No user found with email "${EMAIL}"`)
    process.exit(1)
  }

  if (user.role !== "superadmin") {
    console.error(`User "${EMAIL}" is not a superadmin (role: ${user.role})`)
    process.exit(1)
  }

  // Delete in order respecting foreign keys
  await db.delete(schema.session).where(eq(schema.session.userId, user.id))
  await db.delete(schema.account).where(eq(schema.account.userId, user.id))
  await db.delete(schema.userCenterAccess).where(eq(schema.userCenterAccess.userId, user.id))
  await db.delete(schema.invitation).where(eq(schema.invitation.createdBy, user.id))
  await db.delete(schema.user).where(eq(schema.user.id, user.id))

  console.log(`Superadmin "${EMAIL}" deleted successfully`)
  process.exit(0)
}

deleteSuperadmin().catch((err) => {
  console.error(err)
  process.exit(1)
})
