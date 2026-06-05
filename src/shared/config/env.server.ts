import "server-only";

import { z } from "zod";

/**
 * サーバ専用 env スキーマ。
 *
 * - `import "server-only"` によりクライアントバンドルへの混入を Next.js が拒否する
 *   （タスク 1.2 の「公開／非公開を型レベルで分離する」要件の実体）。
 * - import 時に `process.env` を検証し、必須変数が欠落していれば例外を投げてプロセスを停止させる
 *   （観測条件「ビルドまたは起動するとエラーで停止すること」の実体）。
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL は Prisma の PostgreSQL 接続文字列です"),
  DIRECT_URL: z
    .string()
    .min(1, "DIRECT_URL は Prisma migrate 用の直接接続 URL です"),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL は有効な URL である必要があります"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY は Supabase の anon キーです"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(
      1,
      "SUPABASE_SERVICE_ROLE_KEY はサーバ専用の権限昇格キーです（クライアント露出禁止）",
    ),
  SESSION_IDLE_TIMEOUT_MIN: z.coerce
    .number()
    .int()
    .positive()
    .default(30),
  LOGIN_LOCK_THRESHOLD: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_DURATION_MIN: z.coerce.number().int().positive().default(15),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "(root)";
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");
}

function loadServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (parsed.success) {
    return parsed.data;
  }

  const message = [
    "必須環境変数の検証に失敗しました。.env.example を参照して値を設定してください。",
    formatIssues(parsed.error),
  ].join("\n");

  console.error(`[env.server] ${message}`);
  throw new Error(message);
}

export const serverEnv: ServerEnv = loadServerEnv();
