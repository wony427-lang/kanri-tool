export function getSessionIdleTimeoutMin(): number {
  const parsed = Number(process.env.SESSION_IDLE_TIMEOUT_MIN ?? 30);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}
