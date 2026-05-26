import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

function normalizePostgresUrl(connectionString: string) {
  const url = new URL(connectionString);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    return connectionString;
  }

  if (url.searchParams.get("sslmode") === "require" && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  if (
    process.env.DATABASE_DISABLE_NEON_POOLER !== "true" &&
    url.hostname.endsWith(".neon.tech") &&
    !url.hostname.includes("-pooler.")
  ) {
    const [endpoint, ...rest] = url.hostname.split(".");
    url.hostname = [`${endpoint}-pooler`, ...rest].join(".");
  }

  return url.toString();
}

const connectionString = normalizePostgresUrl(rawConnectionString);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

if (globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  const adapter = new PrismaPg(
    {
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 15000),
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 10000),
      keepAlive: true,
    },
    {
      onPoolError: (error) => {
        console.warn("Prisma pg pool error", String(error));
      },
      onConnectionError: (error) => {
        console.warn("Prisma pg connection error", String(error));
      },
    },
  );

  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.PRISMA_LOG_QUERIES === "true" ? ["query", "warn", "error"] : ["warn"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;
export default prisma;
