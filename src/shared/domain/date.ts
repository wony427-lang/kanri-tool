export type AlertBucket = "expired" | "within_30" | "within_60" | "within_90";

/**
 * 基準日に年数を加算する。うるう日（2/29）→ 非うるう年は 2/28 に丸める。
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  const month = result.getMonth();
  const day = result.getDate();
  result.setFullYear(result.getFullYear() + years);
  if (result.getMonth() !== month) {
    result.setDate(0);
  } else {
    result.setDate(day);
  }
  return result;
}

/**
 * 次回請求予定日 = 基準日 + 1 年（日付のみ）。
 */
export function calculateNextBillingDate(baseDate: Date): Date {
  return addYears(baseDate, 1);
}

/**
 * v_insurance_alerts view と同一の bucket 分類（Req 9.2）。
 * remaining_days > 90 はアラート対象外（null）。
 */
export function classifyAlertBucket(
  remainingDays: number,
): AlertBucket | null {
  if (remainingDays < 0) {
    return "expired";
  }
  if (remainingDays <= 30) {
    return "within_30";
  }
  if (remainingDays <= 60) {
    return "within_60";
  }
  if (remainingDays <= 90) {
    return "within_90";
  }
  return null;
}

export function parseOptionalDateInput(value: string | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validatePeriod(
  start: Date | null,
  end: Date | null,
): Record<string, string> {
  if (start && end && end < start) {
    return { periodEnd: "終了日は開始日以降を指定してください" };
  }
  return {};
}
