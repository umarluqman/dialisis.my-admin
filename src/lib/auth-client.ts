import { createAuthClient } from "better-auth/react"

const getBaseURL = () => {
  if (import.meta.env.VITE_BASE_URL) {
    return import.meta.env.VITE_BASE_URL
  }

  if (typeof window !== "undefined") {
    return window.location.origin
  }

  return "http://localhost:3000"
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
})

export const { signIn, signUp, signOut, useSession } = authClient
