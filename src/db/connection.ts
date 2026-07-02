import { drizzle } from "drizzle-orm/libsql"
import { createClient } from "@libsql/client/web"
import * as schema from "./schema"

const getEnv = () => {
  if (typeof process !== "undefined") {
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }
  }

  return { url: undefined, authToken: undefined }
}

const { url, authToken } = getEnv()

export const client = createClient({
  url: url!,
  authToken,
})

export const db = drizzle(client, { schema })
