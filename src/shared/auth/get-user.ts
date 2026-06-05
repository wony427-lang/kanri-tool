import "server-only";

import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/shared/supabase/server";

/**
 * Server Action / Server Component / Route Handler 境界で
 * 最新のユーザー識別を取得する。
 *
 * - `auth.getUser()` は Supabase Auth サーバへ問い合わせて JWT を検証するため、
 *   書き込み境界で「停止済みアカウントの即時拒否」を実現できる。
 * - middleware で高頻度に走らせる軽量検証には `getClaims()`
 *   （`@/shared/auth/get-claims.ts`）を使う規約とする。
 * - 未認証 / 検証失敗時は `null` を返す。呼び出し側が認可エラーへ変換する。
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}
