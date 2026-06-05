// タスク 2.1「コアエンティティのスキーマ定義（施設・職員・所属関係・ロックアウト）」の
// スキーマ契約テスト。
//
// スキーマ自体は Prisma migrate dev が DDL 生成・適用までを担う領域だが、
// 「どのテーブル／カラム／制約が schema.prisma に確定で定義されているか」は
// アプリケーションの不変条件として明示的に固定したい。実 DB に接続せず
// schema.prisma 本体を一次ソースとしてテキスト解析することで、Vitest 単体テストの
// レベルでスキーマ仕様のリグレッションを検出する。
//
// 詳細な業務要件は `.kiro/specs/resident-management/requirements.md` Req 1.6 /
// 3.1〜3.4 / 15.1 / 15.5、設計判断は `.kiro/specs/resident-management/design.md`
// および `.kiro/steering/database.md` を参照。

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const schemaPath = join(process.cwd(), "prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

function extractBlock(kind: "model" | "enum", name: string): string {
  // schema.prisma の `model X { ... }` / `enum X { ... }` ブロックを抜き出す。
  // ブロック本体に `{` `}` を含めないことを前提に最短マッチで取り出す。
  const re = new RegExp(`${kind}\\s+${name}\\s*\\{[\\s\\S]*?\\n\\}`, "m");
  const matched = schema.match(re);
  if (!matched) {
    throw new Error(`${kind} ${name} not found in prisma/schema.prisma`);
  }
  return matched[0];
}

describe("task 2.1 — schema.prisma core entities contract", () => {
  describe("enum Role", () => {
    const block = extractBlock("enum", "Role");

    it("admin / staff / viewer の 3 値を持つ", () => {
      expect(block).toMatch(/\badmin\b/);
      expect(block).toMatch(/\bstaff\b/);
      expect(block).toMatch(/\bviewer\b/);
    });
  });

  describe("model Facility (facilities)", () => {
    const block = extractBlock("model", "Facility");

    it("テーブル名は facilities にマップされる", () => {
      expect(block).toMatch(/@@map\(\s*"facilities"\s*\)/);
    });

    it("id は UUID PK で gen_random_uuid() を既定値に持つ", () => {
      expect(block).toMatch(/id\s+String\s+@id[^\n]*@db\.Uuid/);
      expect(block).toMatch(/gen_random_uuid\(\)/);
    });

    it("name と is_active(default true) を持つ", () => {
      expect(block).toMatch(/name\s+String/);
      expect(block).toMatch(
        /isActive\s+Boolean[^\n]*@default\(true\)[^\n]*@map\(\s*"is_active"\s*\)/,
      );
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

  describe("model StaffAccount (staff_accounts)", () => {
    const block = extractBlock("model", "StaffAccount");

    it("テーブル名は staff_accounts にマップされる", () => {
      expect(block).toMatch(/@@map\(\s*"staff_accounts"\s*\)/);
    });

    it("auth_user_id は Supabase Auth ユーザーと 1:1 を表現する UNIQUE 列", () => {
      expect(block).toMatch(
        /authUserId\s+String\s+@unique[^\n]*@map\(\s*"auth_user_id"\s*\)[^\n]*@db\.Uuid/,
      );
    });

    it("login_id は UNIQUE（一意ログイン ID 用）", () => {
      expect(block).toMatch(
        /loginId\s+String\s+@unique[^\n]*@map\(\s*"login_id"\s*\)/,
      );
    });

    it("email は UNIQUE", () => {
      expect(block).toMatch(/email\s+String\s+@unique/);
    });

    it("role は Role enum 型", () => {
      expect(block).toMatch(/role\s+Role\b/);
    });

    it("is_active (default true) と last_login_at (nullable timestamptz) を持つ", () => {
      expect(block).toMatch(
        /isActive\s+Boolean[^\n]*@default\(true\)[^\n]*@map\(\s*"is_active"\s*\)/,
      );
      expect(block).toMatch(
        /lastLoginAt\s+DateTime\?[^\n]*@map\(\s*"last_login_at"\s*\)[^\n]*@db\.Timestamptz/,
      );
    });

    it("display_name を持つ", () => {
      expect(block).toMatch(
        /displayName\s+String[^\n]*@map\(\s*"display_name"\s*\)/,
      );
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

  describe("model StaffAccountFacility (staff_account_facilities)", () => {
    const block = extractBlock("model", "StaffAccountFacility");

    it("テーブル名は staff_account_facilities にマップされる", () => {
      expect(block).toMatch(/@@map\(\s*"staff_account_facilities"\s*\)/);
    });

    it("(staff_account_id, facility_id) を複合主キーに持つ", () => {
      expect(block).toMatch(
        /@@id\(\s*\[\s*staffAccountId\s*,\s*facilityId\s*\]\s*\)/,
      );
      expect(block).toMatch(
        /staffAccountId\s+String[^\n]*@map\(\s*"staff_account_id"\s*\)[^\n]*@db\.Uuid/,
      );
      expect(block).toMatch(
        /facilityId\s+String[^\n]*@map\(\s*"facility_id"\s*\)[^\n]*@db\.Uuid/,
      );
    });

    it("staff_accounts への FK は ON DELETE CASCADE（職員削除で所属が掃除される）", () => {
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[staffAccountId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Cascade/,
      );
    });

    it("facilities への FK は ON DELETE RESTRICT（施設の誤削除を防ぐ）", () => {
      expect(block).toMatch(
        /@relation\([^)]*fields:\s*\[facilityId\][^)]*references:\s*\[id\][^)]*onDelete:\s*Restrict/,
      );
    });
  });

  describe("model LoginAttempt (login_attempts)", () => {
    const block = extractBlock("model", "LoginAttempt");

    it("テーブル名は login_attempts にマップされる", () => {
      expect(block).toMatch(/@@map\(\s*"login_attempts"\s*\)/);
    });

    it("id は UUID PK", () => {
      expect(block).toMatch(/id\s+String\s+@id[^\n]*@db\.Uuid/);
    });

    it("login_id / succeeded / ip / attempted_at を持つ", () => {
      expect(block).toMatch(/loginId\s+String[^\n]*@map\(\s*"login_id"\s*\)/);
      expect(block).toMatch(/succeeded\s+Boolean\b/);
      expect(block).toMatch(/ip\s+String\?[^\n]*@db\.Inet/);
      expect(block).toMatch(
        /attemptedAt\s+DateTime[^\n]*@map\(\s*"attempted_at"\s*\)[^\n]*@db\.Timestamptz/,
      );
    });

    it("(login_id, attempted_at desc) インデックスでロック判定の絞り込みを高速化する", () => {
      expect(block).toMatch(
        /@@index\(\s*\[\s*loginId\s*,\s*attemptedAt\(\s*sort:\s*Desc\s*\)\s*\]\s*\)/,
      );
    });
  });
});
