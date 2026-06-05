// タスク 1.3 観測条件「アプリから DB へクエリ可能」を確認する smoke test。
// `npx tsx scripts/smoke-db.ts` で実行する。

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const before = await prisma.systemMeta.findMany();
    console.log(`[smoke-db] read OK: ${before.length} row(s) in system_meta`);

    const upserted = await prisma.systemMeta.upsert({
      where: { key: "smoke" },
      create: { key: "smoke", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });
    console.log(
      `[smoke-db] upsert OK: key=${upserted.key} value=${upserted.value}`,
    );

    const after = await prisma.systemMeta.findMany();
    console.log(`[smoke-db] read-after-write OK: ${after.length} row(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[smoke-db] FAILED:", error);
  process.exit(1);
});
