import { drizzle } from "drizzle-orm/libsql"
import { createClient } from "@libsql/client/web"
import * as schema from "./schema"

const getEnv = () => {
  if (typeof process !== "undefined" && process.env?.TURSO_DATABASE_URL) {
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }
  }
  const { env } = require("cloudflare:workers")
  return {
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  }
}

const { url, authToken } = getEnv()

const client = createClient({
  url: url!,
  authToken,
})

export const db = drizzle(client, { schema })
