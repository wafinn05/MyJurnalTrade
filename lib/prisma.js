import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

// Mencegah multiple instance Prisma Client di development (hot reload)
const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
