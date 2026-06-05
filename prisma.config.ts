import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Next.js と同じ優先順位（.env.local > .env.development > .env）で env を読み込む。
// これにより `npx prisma migrate dev` 等の CLI コマンドも、Next.js アプリと同一の
// `.env.local` を参照できる。
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Prisma v7: schema.prisma から datasource.url が廃止されたため、
  // CLI 用の接続 URL はここで指定する。マイグレーション系コマンドは
  // PgBouncer を経由しない DIRECT_URL（5432）を使う必要がある。
  //
  // `env()` ヘルパは即時評価で env 欠落時に config 読み込み自体を止めるため、
  // DB 接続不要な `prisma generate` も通せなくなる。CI／初回 generate を救うため
  // 直接 `process.env` を参照し、欠落時は空文字を渡して downstream の
  // migrate / push 側で明確にエラーを出させる方針とする。
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
