import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Singleton so we don't exhaust DB connections in dev with hot-reload.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
