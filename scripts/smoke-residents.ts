// タスク 2.2 観測条件「`emergency_contacts` の `(resident_id, sort_order)` UNIQUE
// が機能する」、および付随して導入した CHECK 制約（usage_status ↔ move_out_date /
// sort_order ∈ {1, 2}）が DB で作動することを実 DB に対して確認する smoke test。
//
// 実行: `npx tsx scripts/smoke-residents.ts`
//
// 注意: 本スクリプトは新規施設＋利用者＋緊急連絡先を実際に書き込み、終了時に必ず
// 元の状態へロールバックする（finally で削除）。Supabase の DEV DB 専用。

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

  const facilityName = `smoke-residents-${Date.now()}`;
  let facilityId: string | null = null;
  let residentId: string | null = null;

  try {
    const facility = await prisma.facility.create({
      data: { name: facilityName },
    });
    facilityId = facility.id;
    record({
      ok: true,
      description: `facilities INSERT OK (id=${facility.id})`,
    });

    const resident = await prisma.resident.create({
      data: {
        facilityId: facility.id,
        name: "スモーク 太郎",
        nameKana: "スモークタロウ",
        birthDate: new Date("1940-01-15"),
        gender: "male",
        usageStatus: "active",
      },
    });
    residentId = resident.id;
    record({
      ok: true,
      description: `residents INSERT OK (active / move_out_date null)`,
    });

    await prisma.emergencyContact.create({
      data: {
        residentId: resident.id,
        sortOrder: 1,
        name: "スモーク 花子",
      },
    });
    record({ ok: true, description: "emergency_contacts sort_order=1 OK" });

    await prisma.emergencyContact.create({
      data: {
        residentId: resident.id,
        sortOrder: 2,
        name: "スモーク 次郎",
      },
    });
    record({ ok: true, description: "emergency_contacts sort_order=2 OK" });

    // UNIQUE 違反: 同一 (resident_id, sort_order) を再投入 → 拒否を期待
    await expectThrows(
      "UNIQUE(resident_id, sort_order) で sort_order=1 の重複が拒否される",
      () =>
        prisma.emergencyContact.create({
          data: {
            residentId: resident.id,
            sortOrder: 1,
            name: "スモーク 三郎",
          },
        }),
      /Unique constraint|emergency_contacts_resident_id_sort_order_key/i,
    );

    // CHECK 違反: sort_order = 3 → 拒否を期待
    await expectThrows(
      "CHECK(sort_order IN (1, 2)) で sort_order=3 が拒否される",
      () =>
        prisma.emergencyContact.create({
          data: {
            residentId: resident.id,
            sortOrder: 3,
            name: "スモーク 四郎",
          },
        }),
      /sort_order|check/i,
    );

    // CHECK 違反: usage_status=discharged かつ move_out_date NULL → 拒否を期待
    await expectThrows(
      "residents.discharged で move_out_date NULL が拒否される",
      () =>
        prisma.resident.create({
          data: {
            facilityId: facility.id,
            name: "退去整合 違反",
            nameKana: "タイキョセイゴウイハン",
            birthDate: new Date("1935-05-05"),
            gender: "female",
            usageStatus: "discharged",
            // move_out_date を意図的に未設定
          },
        }),
      /move_out_date|consistency|check/i,
    );

    // CHECK 違反: usage_status=active かつ move_out_date が設定されている → 拒否を期待
    await expectThrows(
      "residents.active で move_out_date が設定されると拒否される",
      () =>
        prisma.resident.create({
          data: {
            facilityId: facility.id,
            name: "入居中なのに退去日あり",
            nameKana: "ニュウキョチュウナノニタイキョビアリ",
            birthDate: new Date("1942-03-03"),
            gender: "female",
            usageStatus: "active",
            moveOutDate: new Date("2026-01-01"),
          },
        }),
      /move_out_date|consistency|check/i,
    );

    // 正常パス: discharged + move_out_date 設定 → 受理を期待
    const discharged = await prisma.resident.create({
      data: {
        facilityId: facility.id,
        name: "退去 太郎",
        nameKana: "タイキョタロウ",
        birthDate: new Date("1938-08-08"),
        gender: "male",
        usageStatus: "discharged",
        moveOutDate: new Date("2025-12-31"),
      },
    });
    record({
      ok: true,
      description: "discharged + move_out_date 設定の利用者 INSERT が受理される",
    });
    // 即削除（クリーンアップ対象に含めない）
    await prisma.resident.delete({ where: { id: discharged.id } });
  } finally {
    if (residentId) {
      await prisma.resident.delete({ where: { id: residentId } }).catch(() => {
        // CASCADE で連絡先も消える前提
      });
    }
    if (facilityId) {
      await prisma.facility
        .delete({ where: { id: facilityId } })
        .catch((e) => {
          console.error("[smoke-residents] facility cleanup failed:", e);
        });
    }
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(
      `\n[smoke-residents] FAILED: ${failed.length} / ${results.length} checks`,
    );
    process.exit(1);
  }
  console.log(
    `\n[smoke-residents] PASS: ${results.length} / ${results.length} checks`,
  );
}

main().catch((error) => {
  console.error("[smoke-residents] UNEXPECTED FAILURE:", error);
  process.exit(1);
});
