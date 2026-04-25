import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

/**
 * NextAuth Route Handler (App Router)
 * 
 * This file serves as the main entry point for authentication requests.
 * All logic is centralized in authOptions.ts for maintainability.
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
