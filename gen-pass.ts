import { hashPassword } from "better-auth/crypto";

const password = "your-new-password"; // SET YOUR PASSWORD HERE
const hash = await hashPassword(password);
console.log("\n--- COPY THIS HASH INTO YOUR SQL ---");
console.log(hash);
console.log("------------------------------------\n");
