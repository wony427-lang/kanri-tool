import { createBrowserClient } from "@supabase/ssr";

import { clientEnv } from "@/shared/config/env.client";

/**
 * Client Components から呼び出す Supabase クライアント。
 *
 * - `clientEnv` 経由で `NEXT_PUBLIC_*` のみを参照する（service role key は型レベルで触れない）。
 * - クッキー処理は `@supabase/ssr` の既定実装に任せる（document.cookie 経由）。
 * - 業務データの読み書きは Server Components / Server Actions 経由とし、
 *   このクライアントは認証 UI（再認証・パスワード変更等）の補助に限定する想定。
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
