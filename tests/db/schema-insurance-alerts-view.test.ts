// タスク 2.6「期限アラート view と性能インデックスの整備」の契約テスト。
//
// Prisma が view を直接モデル化しないため、マイグレーション SQL を一次ソースとして
// `v_insurance_alerts` の UNION 構成・bucket 計算・性能インデックスを固定する。
// residents の複合インデックスは schema.prisma でも宣言する。
//
// 要件: Req 9.1（6 種監視）, 9.2（4 区分 bucket）, 9.5（表示時点の日付基準）,
//       14.1（ダッシュボード集計の性能）。

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const schemaPath = join(process.cwd(), "prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

const migrationsDir = join(process.cwd(), "prisma/migrations");

function extractBlock(kind: "model", name: string): string {
  const re = new RegExp(`${kind}\\s+${name}\\s*\\{[\\s\\S]*?\\n\\}`, "m");
  const matched = schema.match(re);
  if (!matched) {
    throw new Error(`${kind} ${name} not found in prisma/schema.prisma`);
  }
  return matched[0];
}

function readAllMigrationSql(): string {
  const dirents = readdirSync(migrationsDir);
  const sqls: string[] = [];
  for (const d of dirents) {
    const full = join(migrationsDir, d);
    try {
      if (!statSync(full).isDirectory()) continue;
    } catch {
      continue;
    }
    try {
      sqls.push(readFileSync(join(full, "migration.sql"), "utf8"));
    } catch {
      // skip
    }
  }
  return sqls.join("\n");
}

describe("task 2.6 — v_insurance_alerts view and performance indexes", () => {
  describe("model Resident — search indexes", () => {
    const block = extractBlock("model", "Resident");

    it("(facility_id, name_kana) の複合インデックスを持つ", () => {
      expect(block).toMatch(
        /@@index\(\s*\[\s*facilityId\s*,\s*nameKana\s*\]\s*\)/,
      );
    });

    it("(facility_id, usage_status) の複合インデックスを持つ", () => {
      expect(block).toMatch(
        /@@index\(\s*\[\s*facilityId\s*,\s*usageStatus\s*\]\s*\)/,
      );
    });
  });

  describe("migration SQL: v_insurance_alerts view", () => {
    const allSql = readAllMigrationSql();

    it("CREATE VIEW v_insurance_alerts が定義されている", () => {
      expect(allSql).toMatch(
        /CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+"?v_insurance_alerts"?/i,
      );
    });

    it("6 種の insurance_kind を UNION ALL で集約する", () => {
      expect(allSql).toMatch(/'care'/);
      expect(allSql).toMatch(/'medical'/);
      expect(allSql).toMatch(/'disability'/);
      expect(allSql).toMatch(/'burden_ratio'/);
      expect(allSql).toMatch(/'public_expense'/);
      expect(allSql).toMatch(/'comprehensive'/);
      expect(allSql).toMatch(/UNION\s+ALL/i);
    });

    it("alert_key / resident_id / facility_id / end_date / remaining_days / bucket 列を返す", () => {
      expect(allSql).toMatch(/alert_key/i);
      expect(allSql).toMatch(/resident_id/i);
      expect(allSql).toMatch(/facility_id/i);
      expect(allSql).toMatch(/end_date/i);
      expect(allSql).toMatch(/remaining_days/i);
      expect(allSql).toMatch(/bucket/i);
    });

    it("remaining_days は end_date と CURRENT_DATE の差分で計算される（Req 9.5）", () => {
      expect(allSql).toMatch(/CURRENT_DATE/i);
      expect(allSql).toMatch(/remaining_days[\s\S]*end_date|end_date[\s\S]*remaining_days/i);
    });

    it("bucket は expired / within_30 / within_60 / within_90 の 4 区分（Req 9.2）", () => {
      expect(allSql).toMatch(/'expired'/);
      expect(allSql).toMatch(/'within_30'/);
      expect(allSql).toMatch(/'within_60'/);
      expect(allSql).toMatch(/'within_90'/);
    });

    it("介護保険は period_end と burden_ratio_expires_at の 2 源泉を含む", () => {
      expect(allSql).toMatch(/care_insurance[\s\S]*period_end/i);
      expect(allSql).toMatch(/care_insurance[\s\S]*burden_ratio_expires_at/i);
    });

    it("医療・障害・公費・総合保険の期限列を参照する", () => {
      expect(allSql).toMatch(/medical_insurance[\s\S]*expires_at/i);
      expect(allSql).toMatch(/disability_welfare_info[\s\S]*period_end/i);
      expect(allSql).toMatch(/public_expense_records[\s\S]*expires_at/i);
      expect(allSql).toMatch(/comprehensive_insurance_records[\s\S]*end_date/i);
    });
  });

  describe("migration SQL: end_date 系パフォーマンスインデックス", () => {
    const allSql = readAllMigrationSql();

    it("residents に (facility_id, name_kana) インデックス", () => {
      expect(allSql).toMatch(
        /residents[\s\S]*INDEX[\s\S]*facility_id[\s\S]*name_kana/i,
      );
    });

    it("residents に (facility_id, usage_status) インデックス", () => {
      expect(allSql).toMatch(
        /residents[\s\S]*INDEX[\s\S]*facility_id[\s\S]*usage_status/i,
      );
    });

    it("care_insurance に period_end インデックス", () => {
      expect(allSql).toMatch(
        /care_insurance[\s\S]*INDEX[\s\S]*period_end/i,
      );
    });

    it("care_insurance に burden_ratio_expires_at インデックス", () => {
      expect(allSql).toMatch(
        /care_insurance[\s\S]*INDEX[\s\S]*burden_ratio_expires_at/i,
      );
    });

    it("medical_insurance に expires_at インデックス", () => {
      expect(allSql).toMatch(
        /medical_insurance[\s\S]*INDEX[\s\S]*expires_at/i,
      );
    });

    it("disability_welfare_info に period_end インデックス", () => {
      expect(allSql).toMatch(
        /disability_welfare_info[\s\S]*INDEX[\s\S]*period_end/i,
      );
    });

    it("public_expense_records に expires_at インデックス", () => {
      expect(allSql).toMatch(
        /public_expense_records[\s\S]*INDEX[\s\S]*expires_at/i,
      );
    });

    it("comprehensive_insurance_records に end_date インデックス", () => {
      expect(allSql).toMatch(
        /comprehensive_insurance_records[\s\S]*INDEX[\s\S]*end_date/i,
      );
    });
  });
});
