export const LAST_ACTIVITY_COOKIE = "kanri-last-activity";

export function getIdleTimeoutMs(idleTimeoutMin: number): number {
  return idleTimeoutMin * 60 * 1000;
}

export function isIdleSessionExpired(
  lastActivityMs: number | null,
  nowMs: number,
  idleTimeoutMin: number,
): boolean {
  if (lastActivityMs === null) {
    return false;
  }
  return nowMs - lastActivityMs > getIdleTimeoutMs(idleTimeoutMin);
}

export function parseLastActivityCookie(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
