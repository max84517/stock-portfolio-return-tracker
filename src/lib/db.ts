import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // Increase transaction timeout to 30s to accommodate Yahoo Finance API delays
    transactionOptions: { isolationLevel: "Serializable", timeout: 30000 },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
