// タスク 2.4「利用者総合保険（履歴）と添付・連携キー・対応状況のスキーマ定義」の
// スキーマ契約テスト。
//
// 3 テーブル（`comprehensive_insurance_records` / `external_vendor_keys` /
// `alert_status_updates`）と関連 enum を schema.prisma で固定し、
// Prisma で表現できない CHECK 制約はマイグレーション SQL に含まれていることを検証する。
//
// 要件: Req 8.1（年払い保有項目）, 8.4（請求／入金状況の履歴）, 8.7（時系列履歴）,
//       9.4（対応状況の更新）, 12.1〜12.3（外部業者キーと重複禁止）。

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

describe("task 2.4 — comprehensive insurance / vendor keys / alert status", () => {
  describe("enums", () => {
    it("BillingStatus は unbilled / billed", () => {
      const block = extractBlock("enum", "BillingStatus");
      expect(block).toMatch(/\bunbilled\b/);
      expect(block).toMatch(/\bbilled\b/);
    });

    it("PaymentStatus は unpaid / paid", () => {
      const block = extractBlock("enum", "PaymentStatus");
      expect(block).toMatch(/\bunpaid\b/);
      expect(block).toMatch(/\bpaid\b/);
    });

    it("VendorType は介護請求・医療・保険・給食・訪問看護・その他の 6 値", () => {
      const block = extractBlock("enum", "VendorType");
      expect(block).toMatch(/\bcare_billing\b/);
      expect(block).toMatch(/\bmedical\b/);
      expect(block).toMatch(/\binsurer\b/);
      expect(block).toMatch(/\bmeal\b/);
      expect(block).toMatch(/\bhome_nursing\b/);
      expect(block).toMatch(/\bother\b/);
    });

    it("AlertHandleStatus は not_handled / confirmed / contacted / renewed", () => {
      const block = extractBlock("enum", "AlertHandleStatus");
      expect(block).toMatch(/\bnot_handled\b/);
      expect(block).toMatch(/\bconfirmed\b/);
      expect(block).toMatch(/\bcontacted\b/);
      expect(block).toMatch(/\brenewed\b/);
    });
  });

  describe("model ComprehensiveInsuranceRecord (comprehensive_insurance_records)", () => {
    const block = extractBlock("model", "ComprehensiveInsuranceRecord");

    it("テーブル名は comprehensive_insurance_records にマップされ、1:N（id UUID PK）", () => {
      expect(block).toMatch(/@@map\(\s*"comprehensive_insurance_records"\s*\)/);
      expect(block).toMatch(/id\s+String\s+@id[^\n]*@db\.Uuid/);
      expect(block).toMatch(
        /residentId\s+String[^\n]*@map\(\s*"resident_id"\s*\)[^\n]*@db\.Uuid/,
      );
    });

    it("Resident への FK は ON DELETE Cascade", () => {
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[residentId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Cascade/,
      );
    });

    it("Req 8.1 の保有項目（加入有無・保険会社・証券番号・加入日・開始日・終了日・年間保険料・次回請求予定日・備考）", () => {
      expect(block).toMatch(
        /enrolled\s+Boolean[^\n]*@default\(false\)/,
      );
      expect(block).toMatch(
        /insurerName\s+String\?[^\n]*@map\(\s*"insurer_name"\s*\)/,
      );
      expect(block).toMatch(
        /policyNo\s+String\?[^\n]*@map\(\s*"policy_no"\s*\)/,
      );
      expect(block).toMatch(
        /joinedAt\s+DateTime\?[^\n]*@map\(\s*"joined_at"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(
        /startDate\s+DateTime\?[^\n]*@map\(\s*"start_date"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(
        /endDate\s+DateTime\?[^\n]*@map\(\s*"end_date"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(
        /annualPremium\s+Decimal\?[^\n]*@map\(\s*"annual_premium"\s*\)[^\n]*@db\.Decimal\(\s*12\s*,\s*0\s*\)/,
      );
      expect(block).toMatch(
        /nextBillingDate\s+DateTime\?[^\n]*@map\(\s*"next_billing_date"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(/^\s*notes\s+String\?\s*$/m);
    });

    it("請求状況・入金状況の enum 既定値が unbilled / unpaid", () => {
      expect(block).toMatch(
        /billingStatus\s+BillingStatus[^\n]*@default\(unbilled\)[^\n]*@map\(\s*"billing_status"\s*\)/,
      );
      expect(block).toMatch(
        /paymentStatus\s+PaymentStatus[^\n]*@default\(unpaid\)[^\n]*@map\(\s*"payment_status"\s*\)/,
      );
    });
  });

  describe("model ExternalVendorKey (external_vendor_keys)", () => {
    const block = extractBlock("model", "ExternalVendorKey");

    it("テーブル名は external_vendor_keys にマップされる", () => {
      expect(block).toMatch(/@@map\(\s*"external_vendor_keys"\s*\)/);
    });

    it("vendor_type は VendorType enum 型", () => {
      expect(block).toMatch(
        /vendorType\s+VendorType[^?\n]*@map\(\s*"vendor_type"\s*\)/,
      );
    });

    it("(resident_id, vendor_type, vendor_name) を UNIQUE 制約で重複禁止（Req 12.3）", () => {
      expect(block).toMatch(
        /@@unique\(\s*\[\s*residentId\s*,\s*vendorType\s*,\s*vendorName\s*\]\s*\)/,
      );
    });

    it("Resident への FK は ON DELETE Cascade", () => {
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[residentId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Cascade/,
      );
    });

    it("vendor_name / unique_key は必須、notes は nullable", () => {
      expect(block).toMatch(
        /vendorName\s+String[^?\n]*@map\(\s*"vendor_name"\s*\)/,
      );
      expect(block).toMatch(
        /uniqueKey\s+String[^?\n]*@map\(\s*"unique_key"\s*\)/,
      );
      expect(block).toMatch(/^\s*notes\s+String\?\s*$/m);
    });
  });

  describe("model AlertStatusUpdate (alert_status_updates)", () => {
    const block = extractBlock("model", "AlertStatusUpdate");

    it("テーブル名は alert_status_updates にマップされる", () => {
      expect(block).toMatch(/@@map\(\s*"alert_status_updates"\s*\)/);
    });

    it("alert_key 単独 UNIQUE で 1 アラート 1 行の最新値方式（Req 9.4）", () => {
      // 単独 UNIQUE は @@unique([alertKey]) または alertKey @unique のいずれでも可
      expect(block).toMatch(
        /(alertKey\s+String\s+@unique|@@unique\(\s*\[\s*alertKey\s*\]\s*\))/,
      );
    });

    it("status は AlertHandleStatus enum 型で既定 not_handled", () => {
      expect(block).toMatch(
        /status\s+AlertHandleStatus[^\n]*@default\(not_handled\)/,
      );
    });

    it("updated_at / updated_by を保持する", () => {
      expect(block).toMatch(
        /updatedAt\s+DateTime[^\n]*@updatedAt[^\n]*@map\(\s*"updated_at"\s*\)[^\n]*@db\.Timestamptz/,
      );
      expect(block).toMatch(
        /updatedBy\s+String\?[^\n]*@map\(\s*"updated_by"\s*\)[^\n]*@db\.Uuid/,
      );
    });
  });

  describe("migration SQL: DB レベルの CHECK 制約", () => {
    const allSql = readAllMigrationSql();

    it("comprehensive_insurance_records: end_date >= start_date の CHECK", () => {
      expect(allSql).toMatch(
        /comprehensive_insurance_records[\s\S]*CHECK[\s\S]*end_date[\s\S]*start_date/i,
      );
    });

    it("comprehensive_insurance_records: annual_premium >= 0 の CHECK", () => {
      expect(allSql).toMatch(
        /comprehensive_insurance_records[\s\S]*CHECK[\s\S]*annual_premium[\s\S]*>=\s*0/i,
      );
    });
  });
});
