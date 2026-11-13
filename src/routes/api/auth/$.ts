import { auth } from "@/lib/auth"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { createFileRoute } from "@tanstack/react-router"

// Auth queries the user table directly, so new columns must exist before it runs.
const handle = async ({ request }: { request: Request }) => {
  await ensureAdminDatabaseSchema()
  return auth.handler(request)
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
})
