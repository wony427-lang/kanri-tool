// タスク 2.6 観測条件「v_insurance_alerts が 6 種を集計し bucket が日付計算で分類される」
// を実 DB で確認する smoke test。
//
// 実行: `npx tsx scripts/smoke-insurance-alerts-view.ts`

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";

type Outcome =
  | { ok: true; description: string }
  | { ok: false; description: string; reason: string };

type AlertRow = {
  alert_key: string;
  resident_id: string;
  facility_id: string;
  insurance_kind: string;
  end_date: Date;
  remaining_days: number;
  bucket: string | null;
};

const results: Outcome[] = [];

function record(o: Outcome): void {
  results.push(o);
  if (o.ok) {
    console.log(`  ✓ ${o.description}`);
  } else {
    console.error(`  ✗ ${o.description}\n      reason: ${o.reason}`);
  }
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const facilityName = `smoke-insurance-alerts-${Date.now()}`;
  let facilityId: string | null = null;
  let residentId: string | null = null;

  try {
    const [{ today }] = await prisma.$queryRaw<[{ today: Date }]>`
      SELECT CURRENT_DATE::date AS today
    `;

    const facility = await prisma.facility.create({ data: { name: facilityName } });
    facilityId = facility.id;

    const resident = await prisma.resident.create({
      data: {
        facilityId: facility.id,
        name: "アラート 太郎",
        nameKana: "アラートタロウ",
        birthDate: new Date("1940-01-15"),
        gender: "male",
        usageStatus: "active",
      },
    });
    residentId = resident.id;
    record({ ok: true, description: "テスト用 facility + resident を作成" });

    const periodStart = addDays(today, -365);

    await prisma.careInsurance.create({
      data: {
        residentId: resident.id,
        insurerNo: "131234",
        insuredNo: "1234567890",
        periodStart,
        periodEnd: addDays(today, 10),
        burdenRatio: 2,
        burdenRatioExpiresAt: addDays(today, 50),
      },
    });

    await prisma.medicalInsurance.create({
      data: {
        residentId: resident.id,
        insurerNo: "12345678",
        insuredNo: "ABC-001234",
        expiresAt: addDays(today, -5),
      },
    });

    await prisma.disabilityWelfareInfo.create({
      data: {
        residentId: resident.id,
        periodStart,
        periodEnd: addDays(today, 80),
      },
    });

    await prisma.publicExpenseRecord.create({
      data: {
        residentId: resident.id,
        kind: "生活保護",
        payerNo: "12345678",
        expiresAt: addDays(today, 20),
      },
    });

    await prisma.comprehensiveInsuranceRecord.create({
      data: {
        residentId: resident.id,
        enrolled: true,
        startDate: periodStart,
        endDate: addDays(today, -1),
      },
    });

    await prisma.comprehensiveInsuranceRecord.create({
      data: {
        residentId: resident.id,
        enrolled: true,
        startDate: addDays(today, 30),
        endDate: addDays(today, 120),
      },
    });

    record({ ok: true, description: "6 種の源泉データ（90 日超は 1 件）を投入" });

    const rows = await prisma.$queryRaw<AlertRow[]>`
      SELECT alert_key, resident_id, facility_id, insurance_kind, end_date,
             remaining_days::int AS remaining_days, bucket
      FROM v_insurance_alerts
      WHERE resident_id = ${resident.id}::uuid
      ORDER BY insurance_kind
    `;

    const kinds = new Set(rows.map((r) => r.insurance_kind));
    const expectedKinds = [
      "care",
      "medical",
      "disability",
      "burden_ratio",
      "public_expense",
      "comprehensive",
    ];

    if (expectedKinds.every((k) => kinds.has(k)) && kinds.size === 6) {
      record({
        ok: true,
        description: "v_insurance_alerts: 6 種の insurance_kind がすべて出現",
      });
    } else {
      record({
        ok: false,
        description: "v_insurance_alerts: 6 種の insurance_kind がすべて出現",
        reason: `actual kinds: ${[...kinds].join(", ")} (count=${rows.length})`,
      });
    }

    const bucketByKind = Object.fromEntries(
      rows.map((r) => [r.insurance_kind, r.bucket]),
    );

    const bucketChecks: Array<[string, string]> = [
      ["care", "within_30"],
      ["burden_ratio", "within_60"],
      ["medical", "expired"],
      ["disability", "within_90"],
      ["public_expense", "within_30"],
      ["comprehensive", "expired"],
    ];

    for (const [kind, expectedBucket] of bucketChecks) {
      const actual = bucketByKind[kind];
      if (actual === expectedBucket) {
        record({
          ok: true,
          description: `${kind}: bucket=${expectedBucket}`,
        });
      } else {
        record({
          ok: false,
          description: `${kind}: bucket=${expectedBucket}`,
          reason: `actual bucket=${String(actual)}`,
        });
      }
    }

    if (rows.length === 6) {
      record({
        ok: true,
        description: "90 日超の comprehensive は view に含まれない（6 行のみ）",
      });
    } else {
      record({
        ok: false,
        description: "90 日超の comprehensive は view に含まれない（6 行のみ）",
        reason: `row count=${rows.length}`,
      });
    }

    const [{ facility_id: viewFacilityId }] = rows;
    if (viewFacilityId === facility.id) {
      record({ ok: true, description: "facility_id が residents 経由で正しく付与される" });
    } else {
      record({
        ok: false,
        description: "facility_id が residents 経由で正しく付与される",
        reason: `expected=${facility.id}, actual=${viewFacilityId}`,
      });
    }
  } finally {
    if (residentId) {
      await prisma.resident.delete({ where: { id: residentId } }).catch(() => {});
    }
    if (facilityId) {
      await prisma.facility
        .delete({ where: { id: facilityId } })
        .catch((e) => console.error("facility cleanup failed:", e));
    }
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n[smoke-insurance-alerts-view] FAILED (${failed.length} checks)`);
    process.exit(1);
  }
  console.log("\n[smoke-insurance-alerts-view] all checks passed");
}

main().catch((error) => {
  console.error("[smoke-insurance-alerts-view] FAILED:", error);
  process.exit(1);
});
