import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db/connection";
import { createOtpEmail, sendEmail } from "@/lib/email";

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
    enabled: false,
  },

  baseURL: import.meta.env.VITE_BASE_URL || "http://localhost:3000",

  trustedOrigins: [
    "http://localhost:3000",
    "https://admin.dialisis.my",
    "https://admin.dialisis-admin.workers.dev",
  ],

  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      async sendVerificationOTP({ email, otp }) {
        const message = createOtpEmail(otp);
        await sendEmail({
          to: email,
          subject: "Your Dialisis Admin sign-in code",
          html: message.html,
          text: message.text,
        });
      },
    }),
    tanstackStartCookies(),
  ],
});
