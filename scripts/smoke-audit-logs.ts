// タスク 2.5 観測条件「マイグレーション成功 + テストデータ INSERT が機能する」を
// 実 DB で確認する smoke test。
//
// 検証対象:
//   - audit_logs への INSERT（actor あり / actor なし / metadata jsonb）
//   - actor_staff_account_id への FK 整合
//   - created_at 降順での読み取り（インデックス利用の前提確認）
//
// 実行: `npx tsx scripts/smoke-audit-logs.ts`

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

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const authUserId = crypto.randomUUID();
  const loginId = `smoke-audit-${Date.now()}`;
  let staffId: string | null = null;
  let residentId: string | null = null;
  let facilityId: string | null = null;
  const auditLogIds: string[] = [];

  try {
    const staff = await prisma.staffAccount.create({
      data: {
        authUserId,
        displayName: "監査スモーク職員",
        loginId,
        email: `${loginId}@example.test`,
        role: "admin",
      },
    });
    staffId = staff.id;
    record({ ok: true, description: "staff_accounts テスト行を作成" });

    const facility = await prisma.facility.create({
      data: { name: `smoke-audit-facility-${Date.now()}` },
    });
    facilityId = facility.id;

    const resident = await prisma.resident.create({
      data: {
        facilityId: facility.id,
        name: "監査 太郎",
        nameKana: "カンサタロウ",
        birthDate: new Date("1940-01-15"),
        gender: "male",
        usageStatus: "active",
      },
    });
    residentId = resident.id;

    // actor あり + metadata jsonb
    const withActor = await prisma.auditLog.create({
      data: {
        kind: "resident_created",
        actorStaffAccountId: staff.id,
        targetType: "resident",
        targetId: resident.id,
        ip: "192.168.1.100",
        metadata: { facilityId: facility.id, source: "smoke" },
      },
    });
    auditLogIds.push(withActor.id);
    record({
      ok: true,
      description: "audit_logs: actor + metadata jsonb の INSERT が成功",
    });

    // actor なし（未認証 login_failure 想定）
    const withoutActor = await prisma.auditLog.create({
      data: {
        kind: "login_failure",
        targetType: "auth",
        targetId: null,
        ip: "10.0.0.1",
        metadata: { loginId: "unknown-user" },
      },
    });
    auditLogIds.push(withoutActor.id);
    record({
      ok: true,
      description: "audit_logs: actor=null の INSERT が成功（login_failure 想定）",
    });

    // metadata 省略時は {} 既定値
    const defaultMeta = await prisma.auditLog.create({
      data: {
        kind: "logout",
        actorStaffAccountId: staff.id,
        targetType: "auth",
      },
    });
    auditLogIds.push(defaultMeta.id);
    if (
      typeof defaultMeta.metadata !== "object" ||
      defaultMeta.metadata === null ||
      Array.isArray(defaultMeta.metadata)
    ) {
      record({
        ok: false,
        description: "audit_logs: metadata 省略時に {} が適用される",
        reason: `actual: ${JSON.stringify(defaultMeta.metadata)}`,
      });
    } else {
      record({
        ok: true,
        description: "audit_logs: metadata 省略時に {} が適用される",
      });
    }

    // created_at 降順で読み取り（インデックス前提のクエリパス）
    const recent = await prisma.auditLog.findMany({
      where: { actorStaffAccountId: staff.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    if (recent.length < 2) {
      record({
        ok: false,
        description: "audit_logs: actor 別 created_at 降順で 2 件以上取得できる",
        reason: `count=${recent.length}`,
      });
    } else if (recent[0]!.createdAt < recent[1]!.createdAt) {
      record({
        ok: false,
        description: "audit_logs: created_at 降順ソートが機能する",
        reason: "順序が逆転している",
      });
    } else {
      record({
        ok: true,
        description: "audit_logs: actor 別 created_at 降順で取得できる",
      });
    }

    // 全件 created_at 降順（管理者閲覧画面の典型クエリ）
    const allRecent = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    if (allRecent.length === 0) {
      record({
        ok: false,
        description: "audit_logs: created_at 降順で一覧取得できる",
        reason: "0 件",
      });
    } else {
      record({
        ok: true,
        description: `audit_logs: created_at 降順で ${allRecent.length} 件取得できる`,
      });
    }
  } finally {
    for (const id of auditLogIds) {
      await prisma.auditLog.delete({ where: { id } }).catch(() => {});
    }
    if (residentId) {
      await prisma.resident.delete({ where: { id: residentId } }).catch(() => {});
    }
    if (facilityId) {
      await prisma.facility.delete({ where: { id: facilityId } }).catch(() => {});
    }
    if (staffId) {
      await prisma.staffAccount.delete({ where: { id: staffId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(
      `\n[smoke-audit-logs] FAILED: ${failed.length} / ${results.length} checks`,
    );
    process.exit(1);
  }
  console.log(
    `\n[smoke-audit-logs] PASS: ${results.length} / ${results.length} checks`,
  );
}

main().catch((error) => {
  console.error("[smoke-audit-logs] UNEXPECTED FAILURE:", error);
  process.exit(1);
});
