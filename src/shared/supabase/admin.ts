import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/shared/config/env.server";

/**
 * service role key を使う admin クライアント。
 *
 * - **絶対にクライアントへ露出させない**。`server-only` と `serverEnv`
 *   （server-only 経由）で二重に防ぐ。
 * - 用途は Supabase Auth の管理 API（ユーザー作成・停止・再設定メール送信）と、
 *   RLS をバイパスせざるを得ない管理経路に限定する。業務 CRUD は通常クライアント
 *   ＋アプリ層認可（`requirePermission` + `getAccessibleFacilityIds`）を使う。
 * - Cookie ベースのセッションを持たないため、`persistSession=false` /
 *   `autoRefreshToken=false` を指定する（公式推奨）。
 */
export function createSupabaseAdminClient() {
  return createClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
