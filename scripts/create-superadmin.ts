import { auth, INTERNAL_SIGNUP_HEADER, INTERNAL_SIGNUP_SECRET } from "../src/lib/auth"
import { db } from "../src/db/connection"
import * as schema from "../src/db/schema"
import { eq } from "drizzle-orm"

async function createSuperadmin() {
  const [email, password, name = "Super Admin"] = process.argv.slice(2)

  if (!email || !password) {
    console.error("Usage: pnpm create-superadmin <email> <password> [name]")
    process.exit(1)
  }

  const existing = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.email, email),
  })

  if (existing) {
    console.error(`User with email "${email}" already exists. Deleting and re-creating...`)
    await db.delete(schema.account).where(eq(schema.account.userId, existing.id))
    await db.delete(schema.user).where(eq(schema.user.id, existing.id))
  }

  const res = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
    headers: new Headers({
      [INTERNAL_SIGNUP_HEADER]: INTERNAL_SIGNUP_SECRET,
    }),
  })

  if (!res.user) {
    console.error("Failed to create user")
    process.exit(1)
  }

  await db
    .update(schema.user)
    .set({ role: "superadmin" })
    .where(eq(schema.user.id, res.user.id))

  console.log(`Superadmin created: ${email}`)
  process.exit(0)
}

createSuperadmin().catch((err) => {
  console.error(err)
  process.exit(1)
})
