import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { user } from "@/db/schema";

export type UserRole = "pic" | "superadmin";

const getEnvValue = (name: string) => {
  if (typeof process !== "undefined") {
    return process.env?.[name];
  }
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getBootstrapSuperadminEmails = () =>
  (getEnvValue("BOOTSTRAP_SUPERADMIN_EMAILS") || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);

export const isBootstrapSuperadminEmail = (email: string) =>
  getBootstrapSuperadminEmails().includes(normalizeEmail(email));

export async function getUserRole(userId: string): Promise<UserRole> {
  const [userData] = await db
    .select({ email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!userData) return "pic";

  if (isBootstrapSuperadminEmail(userData.email)) {
    if (userData.role !== "superadmin") {
      await db
        .update(user)
        .set({ role: "superadmin" })
        .where(eq(user.id, userId));
    }

    return "superadmin";
  }

  return userData.role;
}
