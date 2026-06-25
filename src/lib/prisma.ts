import { PrismaClient } from "@prisma/client";

// Soft-delete: exclude rows with a deletedAt from every Submission READ. Applied
// as a client extension so we can't miss a query — list/detail/search/analytics
// all go through here. Writes (update/delete) are untouched so the DELETE route
// can still set deletedAt on the row.
function createPrisma() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return base.$extends({
    query: {
      submission: {
        async findMany({ args, query }) { args.where = { ...args.where, deletedAt: null }; return query(args); },
        async findFirst({ args, query }) { args.where = { ...args.where, deletedAt: null }; return query(args); },
        async findFirstOrThrow({ args, query }) { args.where = { ...args.where, deletedAt: null }; return query(args); },
        async count({ args, query }) { args.where = { ...args.where, deletedAt: null }; return query(args); },
        async aggregate({ args, query }) { args.where = { ...args.where, deletedAt: null }; return query(args); },
        async groupBy({ args, query }) { args.where = { ...args.where, deletedAt: null }; return query(args); },
      },
    },
  });
}

// Prevents multiple PrismaClient instances during Next.js hot-reloads in dev.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrisma> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
