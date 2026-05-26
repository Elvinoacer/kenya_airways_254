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

  return url.toString();
}

function isTransientDatabaseError(error: unknown) {
  const anyError = error as {
    code?: string;
    message?: string;
    cause?: { code?: string; message?: string };
  };
  const code = anyError.code || anyError.cause?.code || "";
  const message = `${anyError.message || ""} ${anyError.cause?.message || ""}`;
  return (
    ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH", "P1001", "P1002"].includes(code) ||
    /timeout|timed out|connection terminated|connection.*closed|can't reach database/i.test(message)
  );
}

function isReadOperation(operation: string) {
  return [
    "findUnique",
    "findUniqueOrThrow",
    "findFirst",
    "findFirstOrThrow",
    "findMany",
    "count",
    "aggregate",
    "groupBy",
  ].includes(operation);
}

async function withTransientReadRetry<T>(operation: string, run: () => Promise<T>) {
  const maxAttempts = isReadOperation(operation) ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isTransientDatabaseError(error)) {
        throw error;
      }

      const delayMs = 200 * attempt;
      console.warn("Transient database error, retrying read query", {
        operation,
        attempt,
        delayMs,
        error: String(error),
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
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
    log: ["error", "warn"],
  }).$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          return withTransientReadRetry(operation, () => query(args));
        },
      },
    },
  }) as unknown as PrismaClient;

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;
export default prisma;
