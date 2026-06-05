// タスク 17.4: ダッシュボード集計と利用者一覧の性能スモーク。
// 実行: `npx tsx scripts/perf-smoke.ts`
//
// 観測条件（開発環境目安）:
// - ダッシュボード集計: 1 秒以内
// - 利用者一覧 50 件: 500 ms 以内

import { loadEnvConfig } from "@next/env";
import { performance } from "node:perf_hooks";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";

import { getDashboardSummary } from "../src/domains/dashboard/service.ts";
import { searchResidents } from "../src/domains/residents/service.ts";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import type { SessionContext } from "../src/shared/authorization/types.ts";

const DASHBOARD_SLA_MS = 1000;
const LIST_SLA_MS = 500;

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const facilities = await prisma.facility.findMany({ select: { id: true }, take: 1 });
  if (facilities.length === 0) {
    console.error("施設データがありません。先に smoke データを投入してください。");
    process.exit(1);
  }

  const session: SessionContext = {
    userId: "perf-smoke",
    staffAccountId: "00000000-0000-4000-8000-000000000099",
    role: "admin",
    facilityIds: facilities.map((f) => f.id),
    isActive: true,
  };

  const dashboardStart = performance.now();
  await getDashboardSummary(session);
  const dashboardMs = performance.now() - dashboardStart;

  const listStart = performance.now();
  await searchResidents(
    {
      pagination: { offset: 0, limit: 50 },
      sort: { column: "name", direction: "asc" },
    },
    session,
  );
  const listMs = performance.now() - listStart;

  const residentCount = await prisma.resident.count();

  console.log(`利用者件数: ${residentCount}`);
  console.log(`ダッシュボード集計: ${dashboardMs.toFixed(1)} ms (SLA ${DASHBOARD_SLA_MS} ms)`);
  console.log(`利用者一覧 50 件: ${listMs.toFixed(1)} ms (SLA ${LIST_SLA_MS} ms)`);

  const dashboardOk = dashboardMs <= DASHBOARD_SLA_MS;
  const listOk = listMs <= LIST_SLA_MS;

  if (!dashboardOk || !listOk) {
    console.error("性能 SLA を満たしませんでした。インデックスまたはクエリの見直しが必要です。");
    process.exit(1);
  }

  console.log("性能スモーク: OK");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
