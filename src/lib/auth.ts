import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db/connection";

export const INTERNAL_SIGNUP_HEADER = "x-internal-signup";
export const INTERNAL_SIGNUP_SECRET = "dialisis-internal-signup";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),

  emailAndPassword: {
    enabled: true,
  },

  baseURL: process.env.VITE_BASE_URL || "http://localhost:3000",

  trustedOrigins: [
    "http://localhost:3000",
    "https://admin.dialisis.my",
    "https://admin.dialisis-admin.workers.dev",
  ],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const internal = ctx.headers?.get(INTERNAL_SIGNUP_HEADER);
        if (internal !== INTERNAL_SIGNUP_SECRET) {
          throw new APIError("FORBIDDEN", {
            message: "Sign up requires an invitation link",
          });
        }
      }
    }),
  },

  plugins: [tanstackStartCookies()],
});
