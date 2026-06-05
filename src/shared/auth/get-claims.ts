import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import { createSupabaseProxyClient } from "@/shared/supabase/proxy";

/**
 * middleware 内で呼び出すセッション検証。
 *
 * - `auth.getUser()` で Supabase Auth サーバへ問い合わせ、トークン更新も行う。
 *   ローカル JWT 検証のみの `getClaims()` だと期限切れクッキーが残り、
 *   下流の `getCurrentUser()` と判定がずれることがある。
 * - 戻り値の `response` は middleware からそのまま返す必要がある
 *   （Supabase がリフレッシュしたクッキーを保ったまま下流へ届けるため）。
 * - 認可は middleware だけで完結させず、Server Action / Route Handler 側で
 *   必ず `getCurrentUser()` を再呼出する規約とする（多層防御）。
 */
export async function getCurrentClaims(request: NextRequest): Promise<{
  claims: Record<string, unknown> | null;
  response: NextResponse;
}> {
  const { supabase, response } = createSupabaseProxyClient(request);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { claims: null, response };
  }
  return { claims: { sub: data.user.id }, response };
}
