import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/shared/config/env.server";

/**
 * Prisma Client の singleton。
 *
 * - Prisma v7 ではドライバアダプタ必須。業務クエリは PgBouncer 経由
 *   (`DATABASE_URL`, 6543) で接続する。マイグレーション専用の DIRECT_URL
 *   は `prisma.config.ts` 側で CLI が利用する。
 * - Next.js の dev mode は HMR 中に各モジュールを何度も再評価するため、
 *   `globalThis` にキャッシュして PrismaClient を重複生成しない
 *   （warning や connection leak を防ぐ）。
 * - 本番では globalThis に保持せず、プロセスのライフサイクルに任せる。
 */

type PrismaGlobal = typeof globalThis & {
  __kanriToolPrisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: serverEnv.DATABASE_URL }),
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["warn", "error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.__kanriToolPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__kanriToolPrisma = prisma;
}
