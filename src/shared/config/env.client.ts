import { z } from "zod";

/**
 * クライアントから参照できる env はここに限定する。
 *
 * - `NEXT_PUBLIC_` プレフィックス付きの値のみを公開する規約を型で固定する。
 * - Next.js は `process.env.NEXT_PUBLIC_*` の参照を **ビルド時に静的置換**するため、
 *   実行時の `process.env` ではなく明示的に参照したリテラルから値を受け取る必要がある。
 * - サーバ環境（SSR / Server Components）でも同じモジュールが評価されるが、
 *   import 時の検証はその場で失敗するため、ブラウザ実行時に未定義値が露出することはない。
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL は有効な URL である必要があります"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY は Supabase の anon キーです"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

const clientEnvSource = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

function loadClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse(clientEnvSource);
  if (parsed.success) {
    return parsed.data;
  }

  const message = [
    "NEXT_PUBLIC_ 環境変数の検証に失敗しました。.env.example を参照して値を設定してください。",
    ...parsed.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    ),
  ].join("\n");

  throw new Error(message);
}

export const clientEnv: ClientEnv = loadClientEnv();
