/**
 * Lightweight, lazy Prisma client wrapper.
 * This file purposely avoids static imports so the repo can compile
 * even when `@prisma/client` is not installed in disconnected environments.
 */
let prisma: any = null;

export function getPrisma(): any {
  if (prisma) return prisma;
  try {
    // use eval to avoid static TS module resolution when package is absent
    // eslint-disable-next-line no-eval
    const pkg: any = eval("require")("@prisma/client");
    const PrismaClient = pkg.PrismaClient;
    prisma = new PrismaClient();
  } catch (err) {
    // Prisma not installed or not configured — caller should handle null
    // Keep a minimal fallback to avoid throwing at import time
    // eslint-disable-next-line no-console
    console.warn(
      "Prisma not available. Install @prisma/client to enable DB features.",
    );
    prisma = null;
  }
  return prisma;
}

export default getPrisma;
