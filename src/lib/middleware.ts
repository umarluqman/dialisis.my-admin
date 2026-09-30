import { redirect } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "./auth"
import { readPreview } from "./access"
import { getUserRole } from "./user-role"

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  if (!session) {
    throw redirect({ to: "/auth/sign-in" })
  }

  if (
    getRequest().method !== "GET" &&
    readPreview() &&
    (await getUserRole(session.user.id)) === "superadmin"
  ) {
    throw new Error("Preview is read-only. Exit preview to make changes.")
  }

  return await next({
    context: {
      session,
    },
  })
})
