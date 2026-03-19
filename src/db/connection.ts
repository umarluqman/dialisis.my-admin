import { drizzle } from "drizzle-orm/libsql"
import { createClient } from "@libsql/client/web"
import * as schema from "./schema"

const getEnv = () => {
  console.log("[DB] process defined:", typeof process !== "undefined")
  console.log("[DB] process.env?.TURSO_DATABASE_URL:", !!process?.env?.TURSO_DATABASE_URL)
  
  if (typeof process !== "undefined" && process.env?.TURSO_DATABASE_URL) {
    console.log("[DB] Using process.env")
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }
  }
  
  const { env } = require("cloudflare:workers")
  console.log("[DB] Using cloudflare:workers, URL exists:", !!env.TURSO_DATABASE_URL)
  return {
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  }
}

const { url, authToken } = getEnv()
console.log("[DB] Final URL exists:", !!url)

const client = createClient({
  url: url!,
  authToken,
})

export const db = drizzle(client, { schema })
