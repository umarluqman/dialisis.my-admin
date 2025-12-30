import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
// @ts-ignore
import { db } from "./src/db/connection";

const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
});

const password = "your-new-password"; // SET YOUR PASSWORD HERE
const hash = await auth.api.hashPassword({ password });
console.log("\n--- COPY THIS HASH INTO YOUR SQL ---");
console.log(hash);
console.log("------------------------------------\n");
