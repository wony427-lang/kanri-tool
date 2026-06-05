/**
 * 秘匿値のマスク表示（Req 12.4）。
 * 末尾のみ表示し、それ以外を * で隠す。
 */
export function maskSecretValue(value: string, visibleTail = 2): string {
  if (!value) {
    return "";
  }
  if (value.length <= visibleTail) {
    return "*".repeat(value.length);
  }
  return "*".repeat(value.length - visibleTail) + value.slice(-visibleTail);
}
