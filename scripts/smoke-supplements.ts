// タスク 2.4 観測条件「マイグレーション成功と各 UNIQUE / ENUM の動作確認」を
// 実 DB で確認する smoke test。
//
// 検証対象:
//   - external_vendor_keys (resident_id, vendor_type, vendor_name) UNIQUE
//   - alert_status_updates.alert_key UNIQUE
//   - vendor_type / billing_status / payment_status / alert handle status の enum 受理
//   - comprehensive_insurance_records: period / annual_premium の CHECK
//
// 実行: `npx tsx scripts/smoke-supplements.ts`

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";

type Outcome =
  | { ok: true; description: string }
  | { ok: false; description: string; reason: string };

const results: Outcome[] = [];

function record(o: Outcome): void {
  results.push(o);
  if (o.ok) {
    console.log(`  ✓ ${o.description}`);
  } else {
    console.error(`  ✗ ${o.description}\n      reason: ${o.reason}`);
  }
}

async function expectThrows(
  description: string,
  fn: () => Promise<unknown>,
  expectedPattern: RegExp,
): Promise<void> {
  try {
    await fn();
    record({
      ok: false,
      description,
      reason: "想定された制約違反が発生しなかった",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (expectedPattern.test(message)) {
      record({ ok: true, description });
    } else {
      record({
        ok: false,
        description,
        reason: `想定外のエラー: ${message}`,
      });
    }
  }
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

  const facilityName = `smoke-supplements-${Date.now()}`;
  let facilityId: string | null = null;
  let residentId: string | null = null;
  const alertKey = `smoke-alert-${Date.now()}`;
  let alertCreated = false;

  try {
    const facility = await prisma.facility.create({
      data: { name: facilityName },
    });
    facilityId = facility.id;

    const resident = await prisma.resident.create({
      data: {
        facilityId: facility.id,
        name: "総合保険 太郎",
        nameKana: "ソウゴウホケンタロウ",
        birthDate: new Date("1940-01-15"),
        gender: "male",
        usageStatus: "active",
      },
    });
    residentId = resident.id;
    record({ ok: true, description: "テスト用 facility + resident を作成" });

    // ---- 利用者総合保険: ENUM 既定値と CHECK ----
    const cir1 = await prisma.comprehensiveInsuranceRecord.create({
      data: {
        residentId: resident.id,
        enrolled: true,
        insurerName: "ABC 保険",
        policyNo: "POL-001",
        joinedAt: new Date("2026-01-15"),
        startDate: new Date("2026-02-01"),
        endDate: new Date("2027-01-31"),
        annualPremium: "12000",
        nextBillingDate: new Date("2027-02-01"),
      },
    });
    if (cir1.billingStatus !== "unbilled" || cir1.paymentStatus !== "unpaid") {
      record({
        ok: false,
        description:
          "comprehensive_insurance_records の既定値 billingStatus=unbilled / paymentStatus=unpaid",
        reason: `actual: ${cir1.billingStatus} / ${cir1.paymentStatus}`,
      });
    } else {
      record({
        ok: true,
        description:
          "comprehensive_insurance_records 既定値 unbilled / unpaid が適用される",
      });
    }

    await prisma.comprehensiveInsuranceRecord.create({
      data: {
        residentId: resident.id,
        enrolled: true,
        startDate: new Date("2027-02-01"),
        endDate: new Date("2028-01-31"),
      },
    });
    record({
      ok: true,
      description:
        "comprehensive_insurance_records: 同一 resident_id に N 行（年度履歴）が許される",
    });

    await expectThrows(
      "comprehensive_insurance_records: end_date < start_date を拒否",
      () =>
        prisma.comprehensiveInsuranceRecord.create({
          data: {
            residentId: resident.id,
            startDate: new Date("2028-02-01"),
            endDate: new Date("2027-12-31"),
          },
        }),
      /period|check/i,
    );

    await expectThrows(
      "comprehensive_insurance_records: annual_premium 負の値を拒否",
      () =>
        prisma.comprehensiveInsuranceRecord.create({
          data: {
            residentId: resident.id,
            annualPremium: "-100",
          },
        }),
      /annual_premium|check/i,
    );

    // ---- 外部業者キー: UNIQUE(resident_id, vendor_type, vendor_name) ----
    await prisma.externalVendorKey.create({
      data: {
        residentId: resident.id,
        vendorType: "care_billing",
        vendorName: "Beta 介護請求",
        uniqueKey: "VENDOR-XYZ-12345",
      },
    });
    record({
      ok: true,
      description: "external_vendor_keys: 初回 INSERT が成功",
    });

    await expectThrows(
      "external_vendor_keys: 同一 (resident, vendor_type, vendor_name) の重複を拒否（Req 12.3）",
      () =>
        prisma.externalVendorKey.create({
          data: {
            residentId: resident.id,
            vendorType: "care_billing",
            vendorName: "Beta 介護請求",
            uniqueKey: "VENDOR-XYZ-OTHER",
          },
        }),
      /Unique constraint|external_vendor_keys_resident_id_vendor_type_vendor_name_key/i,
    );

    // 業者種別が違えば同じ vendor_name でも許容される
    await prisma.externalVendorKey.create({
      data: {
        residentId: resident.id,
        vendorType: "meal",
        vendorName: "Beta 介護請求",
        uniqueKey: "MEAL-001",
      },
    });
    record({
      ok: true,
      description:
        "external_vendor_keys: vendor_type 違いなら同一 vendor_name も許容",
    });

    // ---- アラート対応状況: alert_key UNIQUE + status enum 既定値 ----
    const alert = await prisma.alertStatusUpdate.create({
      data: { alertKey, notes: "smoke" },
    });
    alertCreated = true;
    if (alert.status !== "not_handled") {
      record({
        ok: false,
        description: "alert_status_updates: 既定 status=not_handled",
        reason: `actual: ${alert.status}`,
      });
    } else {
      record({
        ok: true,
        description: "alert_status_updates: 既定 status=not_handled が適用",
      });
    }

    await expectThrows(
      "alert_status_updates: 同一 alert_key の重複を拒否",
      () =>
        prisma.alertStatusUpdate.create({
          data: { alertKey, status: "renewed" },
        }),
      /Unique constraint|alert_status_updates_alert_key_key/i,
    );

    // upsert で status 遷移できる
    const updated = await prisma.alertStatusUpdate.update({
      where: { alertKey },
      data: { status: "renewed" },
    });
    if (updated.status !== "renewed") {
      record({
        ok: false,
        description: "alert_status_updates: status を renewed に更新できる",
        reason: `actual: ${updated.status}`,
      });
    } else {
      record({
        ok: true,
        description: "alert_status_updates: status を renewed に更新できる",
      });
    }
  } finally {
    if (residentId) {
      await prisma.resident
        .delete({ where: { id: residentId } })
        .catch(() => {});
    }
    if (facilityId) {
      await prisma.facility
        .delete({ where: { id: facilityId } })
        .catch((e) => console.error("facility cleanup failed:", e));
    }
    if (alertCreated) {
      await prisma.alertStatusUpdate
        .delete({ where: { alertKey } })
        .catch(() => {});
    }
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(
      `\n[smoke-supplements] FAILED: ${failed.length} / ${results.length} checks`,
    );
    process.exit(1);
  }
  console.log(
    `\n[smoke-supplements] PASS: ${results.length} / ${results.length} checks`,
  );
}

main().catch((error) => {
  console.error("[smoke-supplements] UNEXPECTED FAILURE:", error);
  process.exit(1);
});
