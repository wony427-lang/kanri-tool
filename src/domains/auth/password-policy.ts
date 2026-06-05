export function countRecentFailedAttempts(
  attempts: ReadonlyArray<{ succeeded: boolean; attemptedAt: Date }>,
  now: Date,
  lockDurationMin: number,
): number {
  const windowStart = new Date(now.getTime() - lockDurationMin * 60 * 1000);

  return attempts.filter(
    (attempt) => !attempt.succeeded && attempt.attemptedAt >= windowStart,
  ).length;
}

export function isLoginLocked(
  failedAttempts: number,
  threshold: number,
): boolean {
  return failedAttempts >= threshold;
}

export function remainingLockMinutes(
  oldestFailureAt: Date | null,
  now: Date,
  lockDurationMin: number,
): number {
  if (!oldestFailureAt) {
    return lockDurationMin;
  }

  const unlockAt = oldestFailureAt.getTime() + lockDurationMin * 60 * 1000;
  const remainingMs = Math.max(0, unlockAt - now.getTime());
  return Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
}

export const INVALID_CREDENTIALS_MESSAGE =
  "IDまたはパスワードが正しくありません";

/** 運用ポリシー: パスワードは8文字固定 */
export const PASSWORD_LENGTH = 8;

export const PASSWORD_POLICY_MESSAGE =
  "パスワードは8文字で入力してください";

export function validatePasswordStrength(password: string): boolean {
  return password.length === PASSWORD_LENGTH;
}
