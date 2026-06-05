// タスク 2.3「保険情報（介護・医療・障害福祉・公費）のスキーマ定義」の
// スキーマ契約テスト。
//
// 4 種保険テーブルの構造（PK/FK/列/onDelete）と CareLevel enum を schema.prisma で固定し、
// Prisma が直接表現できない CHECK 制約は最新のマイグレーション SQL に含まれていることを
// 検証する（期間整合・桁数・負担割合の値域）。
//
// 要件: Req 7.1〜7.5（4 種類の独立保持と保有項目）, 7.7（桁数・形式違反は拒否）,
//       7.8（期間 end >= start）。

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const schemaPath = join(process.cwd(), "prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

const migrationsDir = join(process.cwd(), "prisma/migrations");

function extractBlock(kind: "model" | "enum", name: string): string {
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

describe("task 2.3 — schema.prisma insurance 4 categories", () => {
  describe("enum CareLevel", () => {
    const block = extractBlock("enum", "CareLevel");

    it("要支援 1/2・要介護 1〜5・認定なしの 8 値を持つ", () => {
      expect(block).toMatch(/\bsupport1\b/);
      expect(block).toMatch(/\bsupport2\b/);
      expect(block).toMatch(/\bcare1\b/);
      expect(block).toMatch(/\bcare2\b/);
      expect(block).toMatch(/\bcare3\b/);
      expect(block).toMatch(/\bcare4\b/);
      expect(block).toMatch(/\bcare5\b/);
      expect(block).toMatch(/\bnot_certified\b/);
    });
  });

  describe("model CareInsurance (care_insurance)", () => {
    const block = extractBlock("model", "CareInsurance");

    it("テーブル名は care_insurance にマップされ、resident_id 単独 PK の 1:1", () => {
      expect(block).toMatch(/@@map\(\s*"care_insurance"\s*\)/);
      expect(block).toMatch(
        /residentId\s+String\s+@id[^\n]*@map\(\s*"resident_id"\s*\)[^\n]*@db\.Uuid/,
      );
    });

    it("Resident への FK は ON DELETE Cascade", () => {
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[residentId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Cascade/,
      );
    });

    it("Req 7.2 の保有項目（保険者番号・被保険者番号・要介護度・認定日・認定有効期間・負担割合）を持つ", () => {
      expect(block).toMatch(
        /insurerNo\s+String\?[^\n]*@map\(\s*"insurer_no"\s*\)/,
      );
      expect(block).toMatch(
        /insuredNo\s+String\?[^\n]*@map\(\s*"insured_no"\s*\)/,
      );
      expect(block).toMatch(/careLevel\s+CareLevel\?[^\n]*@map\(\s*"care_level"\s*\)/);
      expect(block).toMatch(
        /certificationDate\s+DateTime\?[^\n]*@map\(\s*"certification_date"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(
        /periodStart\s+DateTime\?[^\n]*@map\(\s*"period_start"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(
        /periodEnd\s+DateTime\?[^\n]*@map\(\s*"period_end"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(
        /burdenRatio\s+Int\?[^\n]*@map\(\s*"burden_ratio"\s*\)[^\n]*@db\.SmallInt/,
      );
      expect(block).toMatch(
        /burdenRatioExpiresAt\s+DateTime\?[^\n]*@map\(\s*"burden_ratio_expires_at"\s*\)[^\n]*@db\.Date/,
      );
    });
  });

  describe("model MedicalInsurance (medical_insurance)", () => {
    const block = extractBlock("model", "MedicalInsurance");

    it("テーブル名は medical_insurance にマップされ、resident_id 単独 PK", () => {
      expect(block).toMatch(/@@map\(\s*"medical_insurance"\s*\)/);
      expect(block).toMatch(
        /residentId\s+String\s+@id[^\n]*@map\(\s*"resident_id"\s*\)[^\n]*@db\.Uuid/,
      );
    });

    it("Resident への FK は ON DELETE Cascade", () => {
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[residentId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Cascade/,
      );
    });

    it("Req 7.3 の保有項目（保険者番号・被保険者番号・有効期限）を持つ", () => {
      expect(block).toMatch(
        /insurerNo\s+String\?[^\n]*@map\(\s*"insurer_no"\s*\)/,
      );
      expect(block).toMatch(
        /insuredNo\s+String\?[^\n]*@map\(\s*"insured_no"\s*\)/,
      );
      expect(block).toMatch(
        /expiresAt\s+DateTime\?[^\n]*@map\(\s*"expires_at"\s*\)[^\n]*@db\.Date/,
      );
    });
  });

  describe("model DisabilityWelfareInfo (disability_welfare_info)", () => {
    const block = extractBlock("model", "DisabilityWelfareInfo");

    it("テーブル名は disability_welfare_info にマップされ、resident_id 単独 PK の 0..1", () => {
      expect(block).toMatch(/@@map\(\s*"disability_welfare_info"\s*\)/);
      expect(block).toMatch(
        /residentId\s+String\s+@id[^\n]*@map\(\s*"resident_id"\s*\)[^\n]*@db\.Uuid/,
      );
    });

    it("Resident への FK は ON DELETE Cascade", () => {
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[residentId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Cascade/,
      );
    });

    it("Req 7.4 の保有項目（受給者証番号・障害支援区分・サービス種別・支給決定期間・支給量）を持つ", () => {
      expect(block).toMatch(
        /recipientNo\s+String\?[^\n]*@map\(\s*"recipient_no"\s*\)/,
      );
      expect(block).toMatch(
        /supportLevel\s+String\?[^\n]*@map\(\s*"support_level"\s*\)/,
      );
      expect(block).toMatch(
        /serviceType\s+String\?[^\n]*@map\(\s*"service_type"\s*\)/,
      );
      expect(block).toMatch(
        /periodStart\s+DateTime\?[^\n]*@map\(\s*"period_start"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(
        /periodEnd\s+DateTime\?[^\n]*@map\(\s*"period_end"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(
        /serviceQuantity\s+String\?[^\n]*@map\(\s*"service_quantity"\s*\)/,
      );
    });
  });

  describe("model PublicExpenseRecord (public_expense_records)", () => {
    const block = extractBlock("model", "PublicExpenseRecord");

    it("テーブル名は public_expense_records にマップされ、id UUID PK の 1:N", () => {
      expect(block).toMatch(/@@map\(\s*"public_expense_records"\s*\)/);
      expect(block).toMatch(/id\s+String\s+@id[^\n]*@db\.Uuid/);
      expect(block).toMatch(/residentId\s+String[^\n]*@map\(\s*"resident_id"\s*\)[^\n]*@db\.Uuid/);
    });

    it("Resident への FK は ON DELETE Cascade", () => {
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[residentId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Cascade/,
      );
    });

    it("Req 7.5 の保有項目（公費種別・有効期限・負担者番号・受給者番号・本人負担額）を持つ", () => {
      expect(block).toMatch(/^\s*kind\s+String\s*$/m);
      expect(block).toMatch(
        /payerNo\s+String\?[^\n]*@map\(\s*"payer_no"\s*\)/,
      );
      expect(block).toMatch(
        /recipientNo\s+String\?[^\n]*@map\(\s*"recipient_no"\s*\)/,
      );
      expect(block).toMatch(
        /selfBurden\s+Decimal\?[^\n]*@map\(\s*"self_burden"\s*\)[^\n]*@db\.Decimal\(\s*12\s*,\s*0\s*\)/,
      );
      expect(block).toMatch(
        /expiresAt\s+DateTime\?[^\n]*@map\(\s*"expires_at"\s*\)[^\n]*@db\.Date/,
      );
    });
  });

  describe("migration SQL: DB レベルの CHECK 制約", () => {
    const allSql = readAllMigrationSql();

    it("care_insurance: period_end >= period_start の CHECK が存在する（Req 7.8）", () => {
      expect(allSql).toMatch(
        /care_insurance[\s\S]*CHECK[\s\S]*period_end[\s\S]*period_start/i,
      );
    });

    it("disability_welfare_info: period_end >= period_start の CHECK が存在する（Req 7.8）", () => {
      expect(allSql).toMatch(
        /disability_welfare_info[\s\S]*CHECK[\s\S]*period_end[\s\S]*period_start/i,
      );
    });

    it("care_insurance.insurer_no は 6 桁数字、insured_no は 10 桁数字の CHECK（Req 7.7）", () => {
      expect(allSql).toMatch(/care_insurance[\s\S]*insurer_no[\s\S]*\[0-9\]\{6\}/);
      expect(allSql).toMatch(/care_insurance[\s\S]*insured_no[\s\S]*\[0-9\]\{10\}/);
    });

    it("care_insurance.burden_ratio は 1/2/3 のみの CHECK", () => {
      expect(allSql).toMatch(
        /care_insurance[\s\S]*burden_ratio[\s\S]*IN\s*\(\s*1\s*,\s*2\s*,\s*3\s*\)/i,
      );
    });

    it("medical_insurance.insurer_no は 6〜8 桁数字の CHECK（保険種別差異を許容）", () => {
      expect(allSql).toMatch(
        /medical_insurance[\s\S]*insurer_no[\s\S]*\[0-9\][\s\S]*6[\s\S]*8/,
      );
    });

    it("public_expense_records.payer_no は 8 桁数字、recipient_no は 7 桁数字の CHECK", () => {
      expect(allSql).toMatch(
        /public_expense_records[\s\S]*payer_no[\s\S]*\[0-9\]\{8\}/,
      );
      expect(allSql).toMatch(
        /public_expense_records[\s\S]*recipient_no[\s\S]*\[0-9\]\{7\}/,
      );
    });

    it("disability_welfare_info.recipient_no は 10 桁数字の CHECK", () => {
      expect(allSql).toMatch(
        /disability_welfare_info[\s\S]*recipient_no[\s\S]*\[0-9\]\{10\}/,
      );
    });
  });
});
