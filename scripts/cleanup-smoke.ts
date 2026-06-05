// smoke-* スクリプトが異常終了して残置した DEV DB の検証用データを掃除する補助スクリプト。
// `name LIKE 'smoke-%'` の施設行を削除する。CASCADE 設定により利用者・連絡先も連鎖削除される。
//
// 実行: `npx tsx scripts/cleanup-smoke.ts`

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
    const facilities = await prisma.facility.findMany({
      where: { name: { startsWith: "smoke-" } },
      select: { id: true, name: true },
    });
    if (facilities.length === 0) {
      console.log("[cleanup-smoke] no leftover facilities to delete");
      return;
    }

    for (const f of facilities) {
      // 利用者 → 緊急連絡先 / 医療ケア情報の Cascade で先に消す。
      await prisma.resident.deleteMany({ where: { facilityId: f.id } });
      await prisma.facility.delete({ where: { id: f.id } });
      console.log(`[cleanup-smoke] deleted facility id=${f.id} name=${f.name}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[cleanup-smoke] FAILED:", error);
  process.exit(1);
});
