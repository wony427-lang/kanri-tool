import "server-only";

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { clientEnv } from "@/shared/config/env.client";

/**
 * middleware（Edge runtime）から呼び出す Supabase クライアント。
 *
 * - Next.js middleware の責務は「セッションクッキー更新 + 未認証リダイレクト」。
 *   `auth.getClaims()` をここで呼ぶことで、認証必須ルートのレンダリング前に
 *   高頻度・低レイテンシでトークン検証を済ませる。
 * - 返り値の `response` は呼び出し側 middleware からそのまま return する必要がある
 *   （Supabase が `setAll` で書いたクッキーを保ったまま下流に渡すため）。
 * - 認証境界（書き込み）の本検証は Server Action 側の `getUser()` で行う。
 */
export function createSupabaseProxyClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // request.cookies の更新は内部状態反映のため。
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          // response を作り直し、Supabase の最新クッキーを下流へ届ける。
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  return { supabase, response };
}
