// タスク 2.5「監査ログのスキーマ定義」のスキーマ契約テスト。
//
// `audit_logs` テーブルと関連 enum を schema.prisma で固定し、
// 検索用インデックスがマイグレーション SQL に含まれることを検証する。
//
// 要件: Req 16.1（監査対象イベント）, 16.2（操作者・日時・種別・対象・IP）,
//       16.5（管理者のみ閲覧 — スキーマは参照効率のインデックスを担う）。
// 設計: design.md「Audit Log Service」「Logical Data Model」。

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

describe("task 2.5 — schema.prisma audit_logs", () => {
  describe("enum AuditEventKind", () => {
    const block = extractBlock("enum", "AuditEventKind");

    it("design.md AuditEventKind の全 16 値を持つ（Req 16.1）", () => {
      const kinds = [
        "login_success",
        "login_failure",
        "login_locked",
        "logout",
        "permission_denied",
        "resident_created",
        "resident_updated",
        "resident_deleted",
        "pdf_exported",
        "staff_account_created",
        "staff_account_updated",
        "staff_account_disabled",
        "password_reset_requested",
        "password_reset_completed",
        "facility_created",
        "facility_updated",
      ];
      for (const k of kinds) {
        expect(block).toMatch(new RegExp(`\\b${k}\\b`));
      }
    });
  });

  describe("enum AuditTargetType", () => {
    const block = extractBlock("enum", "AuditTargetType");

    it("resident / staff_account / facility / auth の 4 値を持つ", () => {
      expect(block).toMatch(/\bresident\b/);
      expect(block).toMatch(/\bstaff_account\b/);
      expect(block).toMatch(/\bfacility\b/);
      expect(block).toMatch(/\bauth\b/);
    });
  });

  describe("model AuditLog (audit_logs)", () => {
    const block = extractBlock("model", "AuditLog");

    it("テーブル名は audit_logs にマップされる", () => {
      expect(block).toMatch(/@@map\(\s*"audit_logs"\s*\)/);
    });

    it("id は UUID PK で gen_random_uuid() を既定値に持つ", () => {
      expect(block).toMatch(/id\s+String\s+@id[^\n]*@db\.Uuid/);
      expect(block).toMatch(/gen_random_uuid\(\)/);
    });

    it("kind は AuditEventKind enum 型（NOT NULL）", () => {
      expect(block).toMatch(/kind\s+AuditEventKind\b/);
    });

    it("actor_staff_account_id は nullable UUID で StaffAccount への FK（SetNull）", () => {
      expect(block).toMatch(
        /actorStaffAccountId\s+String\?[^\n]*@map\(\s*"actor_staff_account_id"\s*\)[^\n]*@db\.Uuid/,
      );
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[actorStaffAccountId\][^)]*references:\s*\[id\][^)]*onDelete:\s*SetNull/,
      );
    });

    it("target_type は AuditTargetType enum 型（NOT NULL）", () => {
      expect(block).toMatch(
        /targetType\s+AuditTargetType[^?\n]*@map\(\s*"target_type"\s*\)/,
      );
    });

    it("target_id は nullable UUID", () => {
      expect(block).toMatch(
        /targetId\s+String\?[^\n]*@map\(\s*"target_id"\s*\)[^\n]*@db\.Uuid/,
      );
    });

    it("ip は nullable inet 型", () => {
      expect(block).toMatch(/ip\s+String\?[^\n]*@db\.Inet/);
    });

    it("metadata は Json 型（PostgreSQL jsonb）", () => {
      expect(block).toMatch(/metadata\s+Json\b/);
    });

    it("created_at は timestamptz で @default(now())", () => {
      expect(block).toMatch(
        /createdAt\s+DateTime[^\n]*@default\(now\(\)\)[^\n]*@map\(\s*"created_at"\s*\)[^\n]*@db\.Timestamptz/,
      );
    });

    it("(created_at desc) と (actor_staff_account_id, created_at desc) のインデックスを持つ", () => {
      expect(block).toMatch(
        /@@index\(\s*\[\s*createdAt\(\s*sort:\s*Desc\s*\)\s*\]\s*\)/,
      );
      expect(block).toMatch(
        /@@index\(\s*\[\s*actorStaffAccountId\s*,\s*createdAt\(\s*sort:\s*Desc\s*\)\s*\]\s*\)/,
      );
    });
  });

  describe("migration SQL: インデックス", () => {
    const allSql = readAllMigrationSql();

    it("audit_logs に created_at DESC インデックスが存在する", () => {
      expect(allSql).toMatch(
        /audit_logs[\s\S]*INDEX[\s\S]*created_at[\s\S]*DESC/i,
      );
    });

    it("audit_logs に (actor_staff_account_id, created_at DESC) インデックスが存在する", () => {
      expect(allSql).toMatch(
        /audit_logs[\s\S]*INDEX[\s\S]*actor_staff_account_id[\s\S]*created_at[\s\S]*DESC/i,
      );
    });
  });
});
