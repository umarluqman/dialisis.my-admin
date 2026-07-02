import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db/connection";
import { invitation, user } from "@/db/schema";
import { createOtpEmail, sendEmail } from "@/lib/email";

const getEnvValue = (name: string) => {
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }

  const { env } = require("cloudflare:workers");
  return env[name];
};

const getSecret = () => {
  return getEnvValue("BETTER_AUTH_SECRET");
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getBootstrapSuperadminEmails = () =>
  (getEnvValue("BOOTSTRAP_SUPERADMIN_EMAILS") || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);

const isBootstrapSuperadminEmail = (email: string) =>
  getBootstrapSuperadminEmails().includes(normalizeEmail(email));

const hasExistingUser = async (email: string) => {
  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, normalizeEmail(email)))
    .limit(1);

  return Boolean(existingUser);
};

const hasValidInvitation = async (email: string) => {
  const [validInvitation] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.email, normalizeEmail(email)),
        eq(invitation.used, false),
        gt(invitation.expiresAt, new Date())
      )
    )
    .limit(1);

  return Boolean(validInvitation);
};

const canCreateAuthUser = async (email: string) =>
  isBootstrapSuperadminEmail(email) || (await hasValidInvitation(email));

const canSendSignInOtp = async (email: string) =>
  (await hasExistingUser(email)) || (await canCreateAuthUser(email));

const getDefaultName = (email: string) => email.split("@")[0] || "Admin";

const requireAllowedAuthUser = async (newUser: { email: string; name?: string }) => {
  const email = normalizeEmail(newUser.email);

  if (isBootstrapSuperadminEmail(email)) {
    return {
      data: {
        ...newUser,
        email,
        name: newUser.name || getDefaultName(email),
        role: "superadmin",
      },
    };
  }

  if (await hasValidInvitation(email)) {
    return {
      data: {
        ...newUser,
        email,
        role: "pic",
      },
    };
  }

  throw new APIError("FORBIDDEN", {
    message: "Invitation required",
  });
};

export const auth = betterAuth({
  secret: getSecret(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),

  emailAndPassword: {
    enabled: false,
  },

  databaseHooks: {
    user: {
      create: {
        before: requireAllowedAuthUser,
      },
    },
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
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in" && !(await canSendSignInOtp(email))) {
          return;
        }

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
