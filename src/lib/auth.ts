import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db/connection";
import { sendEmail, createPasswordResetEmail } from "@/lib/email";

const getSecret = () => {
  if (typeof process !== "undefined" && process.env?.BETTER_AUTH_SECRET) {
    return process.env.BETTER_AUTH_SECRET;
  }
  const { env } = require("cloudflare:workers");
  return env.BETTER_AUTH_SECRET;
};

export const auth = betterAuth({
  secret: getSecret(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),

  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Reset your password - Dialisis Admin",
        html: createPasswordResetEmail(url),
      });
    },
  },

  baseURL: import.meta.env.VITE_BASE_URL || "http://localhost:3000",

  trustedOrigins: [
    "http://localhost:3000",
    "https://admin.dialisis-admin.workers.dev",
  ],

  plugins: [tanstackStartCookies()],
});
