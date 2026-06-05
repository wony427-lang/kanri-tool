import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { clientEnv } from "@/shared/config/env.client";

/**
 * Server Components / Server Actions / Route Handlers から呼び出す
 * Supabase クライアント。
 *
 * - リクエスト境界ごとに新規生成する（`@supabase/ssr` のガイダンス準拠：
 *   横断キャッシュ禁止）。
 * - 認証検証は Server Action 境界で `auth.getUser()` を呼ぶ規約
 *   （`@/shared/auth/get-user.ts` 参照）。
 * - Server Components から `setAll` が呼ばれた場合は無視する。
 *   トークンリフレッシュは middleware（`proxy.ts`）側で行うため、
 *   ここでの set 失敗は安全に握り潰す。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components から呼ばれた場合は set できないため握り潰す。
            // セッション更新は middleware (proxy) で必ず実施される。
          }
        },
      },
    },
  );
}
