// タスク 2.3 観測条件「期間整合違反データの INSERT が CHECK で拒否される」を
// 実 DB で確認する smoke test。
// 桁数違反・負担割合違反・正常受理パスも同時に検証する。
//
// 実行: `npx tsx scripts/smoke-insurance.ts`
//
// 注意: 終了時に投入した検証用データを必ず削除する（finally で施設削除 → Cascade）。

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

  const facilityName = `smoke-insurance-${Date.now()}`;
  let facilityId: string | null = null;
  let residentId: string | null = null;

  try {
    const facility = await prisma.facility.create({ data: { name: facilityName } });
    facilityId = facility.id;

    const resident = await prisma.resident.create({
      data: {
        facilityId: facility.id,
        name: "保険 太郎",
        nameKana: "ホケンタロウ",
        birthDate: new Date("1940-01-15"),
        gender: "male",
        usageStatus: "active",
      },
    });
    residentId = resident.id;
    record({ ok: true, description: "テスト用 facility + resident を作成" });

    // ---- 期間整合 (Req 7.8) ----
    await expectThrows(
      "care_insurance: period_end < period_start を拒否（Req 7.8）",
      () =>
        prisma.careInsurance.create({
          data: {
            residentId: resident.id,
            insurerNo: "131234",
            insuredNo: "1234567890",
            periodStart: new Date("2026-04-01"),
            periodEnd: new Date("2026-03-31"),
          },
        }),
      /period|check/i,
    );

    await expectThrows(
      "disability_welfare_info: period_end < period_start を拒否（Req 7.8）",
      () =>
        prisma.disabilityWelfareInfo.create({
          data: {
            residentId: resident.id,
            periodStart: new Date("2026-04-01"),
            periodEnd: new Date("2026-03-31"),
          },
        }),
      /period|check/i,
    );

    // ---- 桁数違反 (Req 7.7) ----
    await expectThrows(
      "care_insurance: insurer_no 5 桁が拒否される（要 6 桁）",
      () =>
        prisma.careInsurance.create({
          data: {
            residentId: resident.id,
            insurerNo: "12345",
          },
        }),
      /insurer_no|format|check/i,
    );

    await expectThrows(
      "care_insurance: insured_no 11 桁が拒否される（要 10 桁）",
      () =>
        prisma.careInsurance.create({
          data: {
            residentId: resident.id,
            insuredNo: "12345678901",
          },
        }),
      /insured_no|format|check/i,
    );

    await expectThrows(
      "medical_insurance: insurer_no 5 桁が拒否される（要 6〜8 桁）",
      () =>
        prisma.medicalInsurance.create({
          data: {
            residentId: resident.id,
            insurerNo: "12345",
          },
        }),
      /insurer_no|format|check/i,
    );

    await expectThrows(
      "public_expense_records: payer_no 7 桁が拒否される（要 8 桁）",
      () =>
        prisma.publicExpenseRecord.create({
          data: {
            residentId: resident.id,
            kind: "生活保護",
            payerNo: "1234567",
          },
        }),
      /payer_no|format|check/i,
    );

    await expectThrows(
      "public_expense_records: recipient_no に英字混入が拒否される",
      () =>
        prisma.publicExpenseRecord.create({
          data: {
            residentId: resident.id,
            kind: "生活保護",
            recipientNo: "12abc34",
          },
        }),
      /recipient_no|format|check/i,
    );

    await expectThrows(
      "disability_welfare_info: recipient_no 9 桁が拒否される（要 10 桁）",
      () =>
        prisma.disabilityWelfareInfo.create({
          data: {
            residentId: resident.id,
            recipientNo: "123456789",
          },
        }),
      /recipient_no|format|check/i,
    );

    // ---- 負担割合 (1/2/3) ----
    await expectThrows(
      "care_insurance: burden_ratio=4 が拒否される（1/2/3 のみ）",
      () =>
        prisma.careInsurance.create({
          data: {
            residentId: resident.id,
            burdenRatio: 4,
          },
        }),
      /burden_ratio|check/i,
    );

    // ---- 正常受理パス ----
    const care = await prisma.careInsurance.create({
      data: {
        residentId: resident.id,
        insurerNo: "131234",
        insuredNo: "1234567890",
        careLevel: "care3",
        certificationDate: new Date("2026-01-15"),
        periodStart: new Date("2026-02-01"),
        periodEnd: new Date("2028-01-31"),
        burdenRatio: 2,
        burdenRatioExpiresAt: new Date("2027-07-31"),
      },
    });
    record({
      ok: true,
      description: `care_insurance: 正常データ受理 (residentId=${care.residentId})`,
    });

    const medical = await prisma.medicalInsurance.create({
      data: {
        residentId: resident.id,
        insurerNo: "12345678",
        insuredNo: "ABC-001234",
        expiresAt: new Date("2028-03-31"),
      },
    });
    record({
      ok: true,
      description: `medical_insurance: 正常データ受理 (insurerNo=${medical.insurerNo})`,
    });

    const publicExpense = await prisma.publicExpenseRecord.create({
      data: {
        residentId: resident.id,
        kind: "生活保護",
        payerNo: "12345678",
        recipientNo: "1234567",
        selfBurden: "0",
        expiresAt: new Date("2027-03-31"),
      },
    });
    record({
      ok: true,
      description: `public_expense_records: 正常データ受理 (id=${publicExpense.id})`,
    });
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
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(
      `\n[smoke-insurance] FAILED: ${failed.length} / ${results.length} checks`,
    );
    process.exit(1);
  }
  console.log(
    `\n[smoke-insurance] PASS: ${results.length} / ${results.length} checks`,
  );
}

main().catch((error) => {
  console.error("[smoke-insurance] UNEXPECTED FAILURE:", error);
  process.exit(1);
});
