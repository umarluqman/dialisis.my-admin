import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"

export const hasSession = createServerFn({ method: "GET" }).handler(async () => {
  await ensureAdminDatabaseSchema()
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  return !!session
})
