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

// PBKDF2 password hashing using Web Crypto API (Cloudflare Workers optimized)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(hash);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  return btoa(String.fromCharCode(...combined));
}

async function verifyPassword({
  password,
  hash,
}: {
  password: string;
  hash: string;
}): Promise<boolean> {
  console.log("[AUTH DEBUG] verifyPassword called");
  console.log("[AUTH DEBUG] hash:", hash);
  console.log("[AUTH DEBUG] hash length:", hash?.length);
  
  try {
    const combined = Uint8Array.from(atob(hash), (c) => c.charCodeAt(0));
    console.log("[AUTH DEBUG] combined length:", combined.length);
    
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const newHash = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );
    const newHashArray = new Uint8Array(newHash);
    
    console.log("[AUTH DEBUG] storedHash length:", storedHash.length);
    console.log("[AUTH DEBUG] newHashArray length:", newHashArray.length);
    
    if (storedHash.length !== newHashArray.length) {
      console.log("[AUTH DEBUG] Length mismatch!");
      return false;
    }
    for (let i = 0; i < storedHash.length; i++) {
      if (storedHash[i] !== newHashArray[i]) {
        console.log("[AUTH DEBUG] Hash mismatch at index:", i);
        return false;
      }
    }
    console.log("[AUTH DEBUG] Password verified successfully!");
    return true;
  } catch (error) {
    console.error("[AUTH DEBUG] Error in verifyPassword:", error);
    return false;
  }
}

export const auth = betterAuth({
  secret: getSecret(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),

  emailAndPassword: {
    enabled: true,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
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
