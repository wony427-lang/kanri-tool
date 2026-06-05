// タスク 2.2「利用者・医療ケア・緊急連絡先のスキーマ定義」の
// スキーマ契約テスト。
//
// schema.prisma 本体に閉じる Prisma 表現（モデル/列/UNIQUE/関係/onDelete）は
// テキスト解析で固定する。Prisma が直接表現できない CHECK 制約は、
// 直近のマイグレーション SQL を走査し、必要な制約が宣言されていることを検証する。
//
// 要件: Req 5.1（基本情報項目）, 5.3（usage_status 値域）, 5.4（退去日整合）,
//       10.1（医療機関）, 10.2（ケアマネ）, 10.3（緊急連絡先最大 2 件）。
// 設計: design.md「Logical Data Model」「Domain Model」「Data Integrity」。

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
      const sql = readFileSync(join(full, "migration.sql"), "utf8");
      sqls.push(sql);
    } catch {
      // 当該ディレクトリに migration.sql が無い場合は無視
    }
  }
  return sqls.join("\n");
}

describe("task 2.2 — schema.prisma residents / medical_care_info / emergency_contacts", () => {
  describe("enum UsageStatus", () => {
    const block = extractBlock("enum", "UsageStatus");

    it("active / discharged / scheduled / paused の 4 値を持つ（Req 5.3）", () => {
      expect(block).toMatch(/\bactive\b/);
      expect(block).toMatch(/\bdischarged\b/);
      expect(block).toMatch(/\bscheduled\b/);
      expect(block).toMatch(/\bpaused\b/);
    });
  });

  describe("model Resident (residents)", () => {
    const block = extractBlock("model", "Resident");

    it("テーブル名は residents にマップされる", () => {
      expect(block).toMatch(/@@map\(\s*"residents"\s*\)/);
    });

    it("id は UUID PK で gen_random_uuid() を既定値に持つ", () => {
      expect(block).toMatch(/id\s+String\s+@id[^\n]*@db\.Uuid/);
      expect(block).toMatch(/gen_random_uuid\(\)/);
    });

    it("施設スコープ用 facility_id (UUID, NOT NULL) を持ち、Facility への FK は Restrict", () => {
      expect(block).toMatch(
        /facilityId\s+String[^\n]*@map\(\s*"facility_id"\s*\)[^\n]*@db\.Uuid/,
      );
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[facilityId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Restrict/,
      );
    });

    it("必須項目（name, name_kana, birth_date, gender, usage_status）は NOT NULL", () => {
      expect(block).toMatch(/^\s*name\s+String\s*$/m);
      expect(block).toMatch(
        /nameKana\s+String[^?\n]*@map\(\s*"name_kana"\s*\)/,
      );
      expect(block).toMatch(
        /birthDate\s+DateTime[^?\n]*@map\(\s*"birth_date"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(/^\s*gender\s+String\s*$/m);
      expect(block).toMatch(
        /usageStatus\s+UsageStatus[^?\n]*@map\(\s*"usage_status"\s*\)/,
      );
    });

    it("住所・連絡先・入退去日・備考・病歴は nullable", () => {
      expect(block).toMatch(/^\s*address\s+String\?\s*$/m);
      expect(block).toMatch(/^\s*phone\s+String\?\s*$/m);
      expect(block).toMatch(/^\s*mobile\s+String\?\s*$/m);
      expect(block).toMatch(
        /moveInDate\s+DateTime\?[^\n]*@map\(\s*"move_in_date"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(
        /moveOutDate\s+DateTime\?[^\n]*@map\(\s*"move_out_date"\s*\)[^\n]*@db\.Date/,
      );
      expect(block).toMatch(
        /medicalHistory\s+String\?[^\n]*@map\(\s*"medical_history"\s*\)/,
      );
      expect(block).toMatch(/^\s*notes\s+String\?\s*$/m);
    });

    it("created_at / updated_at は timestamptz", () => {
      expect(block).toMatch(
        /createdAt\s+DateTime[^\n]*@map\(\s*"created_at"\s*\)[^\n]*@db\.Timestamptz/,
      );
      expect(block).toMatch(
        /updatedAt\s+DateTime[^\n]*@updatedAt[^\n]*@map\(\s*"updated_at"\s*\)[^\n]*@db\.Timestamptz/,
      );
    });
  });

  describe("model MedicalCareInfo (medical_care_info)", () => {
    const block = extractBlock("model", "MedicalCareInfo");

    it("テーブル名は medical_care_info にマップされる", () => {
      expect(block).toMatch(/@@map\(\s*"medical_care_info"\s*\)/);
    });

    it("resident_id 単独で PK（1:1 関係）", () => {
      expect(block).toMatch(
        /residentId\s+String\s+@id[^\n]*@map\(\s*"resident_id"\s*\)[^\n]*@db\.Uuid/,
      );
    });

    it("Resident への FK は ON DELETE CASCADE（1:1 子テーブルの掃除）", () => {
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[residentId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Cascade/,
      );
    });

    it("Req 10.1 / 10.2 に対応する列を保持", () => {
      expect(block).toMatch(
        /medicalFacilityName\s+String\?[^\n]*@map\(\s*"medical_facility_name"\s*\)/,
      );
      expect(block).toMatch(
        /primaryDoctor\s+String\?[^\n]*@map\(\s*"primary_doctor"\s*\)/,
      );
      expect(block).toMatch(
        /emergencyHospital\s+String\?[^\n]*@map\(\s*"emergency_hospital"\s*\)/,
      );
      expect(block).toMatch(
        /careOffice\s+String\?[^\n]*@map\(\s*"care_office"\s*\)/,
      );
      expect(block).toMatch(
        /emergencyHospital2\s+String\?[^\n]*@map\(\s*"emergency_hospital2"\s*\)/,
      );
      expect(block).toMatch(
        /careOfficePhone\s+String\?[^\n]*@map\(\s*"care_office_phone"\s*\)/,
      );
      expect(block).toMatch(
        /careOfficeLicenseNo\s+String\?[^\n]*@map\(\s*"care_office_license_no"\s*\)/,
      );
      expect(block).toMatch(
        /careManagerName\s+String\?[^\n]*@map\(\s*"care_manager_name"\s*\)/,
      );
    });
  });

  describe("model EmergencyContact (emergency_contacts)", () => {
    const block = extractBlock("model", "EmergencyContact");

    it("テーブル名は emergency_contacts にマップされる", () => {
      expect(block).toMatch(/@@map\(\s*"emergency_contacts"\s*\)/);
    });

    it("sort_order は SmallInt（連絡先 1/2 のスロット番号）", () => {
      expect(block).toMatch(
        /sortOrder\s+Int[^\n]*@map\(\s*"sort_order"\s*\)[^\n]*@db\.SmallInt/,
      );
    });

    it("(resident_id, sort_order) は UNIQUE で同じスロットの重複を防ぐ（Req 10.3）", () => {
      expect(block).toMatch(
        /@@unique\(\s*\[\s*residentId\s*,\s*sortOrder\s*\]\s*\)/,
      );
    });

    it("Resident への FK は ON DELETE CASCADE", () => {
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[residentId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Cascade/,
      );
    });

    it("name は必須、relationship/address/phone/mobile は nullable", () => {
      expect(block).toMatch(/^\s*name\s+String\s*$/m);
      expect(block).toMatch(/^\s*relationship\s+String\?\s*$/m);
      expect(block).toMatch(/^\s*address\s+String\?\s*$/m);
      expect(block).toMatch(/^\s*phone\s+String\?\s*$/m);
      expect(block).toMatch(/^\s*mobile\s+String\?\s*$/m);
    });
  });

  describe("migration SQL: DB レベルの CHECK 制約", () => {
    const allSql = readAllMigrationSql();

    it("residents.usage_status と move_out_date の整合 CHECK が存在する（Req 5.4 / 5.5）", () => {
      // discharged の場合のみ move_out_date が必須／非 discharged では NULL を要求する
      // 二条件相互制約。実装は ALTER TABLE ... ADD CONSTRAINT ... CHECK (...) もしくは
      // CREATE TABLE 内 CHECK のいずれでも可。
      expect(allSql).toMatch(/residents/);
      expect(allSql).toMatch(/CHECK[\s\S]*usage_status[\s\S]*move_out_date/i);
      expect(allSql).toMatch(/discharged/);
    });

    it("emergency_contacts.sort_order は 1 または 2 に CHECK で制限される（Req 10.3）", () => {
      expect(allSql).toMatch(
        /CHECK[\s\S]*sort_order[\s\S]*IN\s*\(\s*1\s*,\s*2\s*\)/i,
      );
    });
  });
});
