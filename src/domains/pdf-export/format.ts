import { CARE_LEVEL_LABELS } from "@/shared/domain/labels";
import type { CareLevel } from "@prisma/client";

const FULLWIDTH_DIGITS = "０１２３４５６７８９";

const ERAS = [
  { name: "令和", year: 2019, month: 5, day: 1 },
  { name: "平成", year: 1989, month: 1, day: 8 },
  { name: "昭和", year: 1926, month: 12, day: 25 },
  { name: "大正", year: 1912, month: 7, day: 30 },
  { name: "明治", year: 1868, month: 1, day: 25 },
] as const;

function toFullwidthDigits(value: string): string {
  return value.replace(/\d/g, (digit) => FULLWIDTH_DIGITS[Number(digit)] ?? digit);
}

function dateParts(date: Date): { year: number; month: number; day: number } {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function compareDateParts(
  left: { year: number; month: number; day: number },
  right: { year: number; month: number; day: number },
): number {
  if (left.year !== right.year) {
    return left.year - right.year;
  }
  if (left.month !== right.month) {
    return left.month - right.month;
  }
  return left.day - right.day;
}

function eraYear(
  date: { year: number; month: number; day: number },
  era: (typeof ERAS)[number],
): number {
  let year = date.year - era.year + 1;
  if (compareDateParts(date, era) < 0) {
    year -= 1;
  }
  return year;
}

function datePartsLocal(date: Date): { year: number; month: number; day: number } {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function resolveEraFromParts(parts: {
  year: number;
  month: number;
  day: number;
}): { name: string; year: number } {
  for (const era of ERAS) {
    if (compareDateParts(parts, era) >= 0) {
      return { name: era.name, year: eraYear(parts, era) };
    }
  }
  return { name: "明治", year: 1 };
}

/** 和暦日付（例: 令和 5 年 10 月 26 日） */
export function formatWarekiDate(
  date: Date | null | undefined,
  options?: { includeEraName?: boolean; useLocalTime?: boolean },
): string {
  if (!date) {
    return "";
  }
  const parts = options?.useLocalTime ? datePartsLocal(date) : dateParts(date);
  const { name, year } = resolveEraFromParts(parts);
  const body = `${year} 年 ${parts.month} 月 ${parts.day} 日`;
  if (options?.includeEraName === false) {
    return body;
  }
  return `${name} ${body}`;
}

/** 和暦期間（例: 5 年 3 月 23 日 ～ 6 年 3 月 31 日） */
export function formatWarekiPeriod(
  start: Date | null | undefined,
  end: Date | null | undefined,
): string {
  const startText = formatWarekiDate(start, { includeEraName: false });
  const endText = formatWarekiDate(end, { includeEraName: false });
  if (startText && endText) {
    return `${startText} ～ ${endText}`;
  }
  if (startText) {
    return `${startText} ～`;
  }
  if (endText) {
    return `～ ${endText}`;
  }
  return "";
}

export function formatPdfCareLevel(level: CareLevel | null | undefined): string {
  if (!level) {
    return "";
  }
  return toFullwidthDigits(CARE_LEVEL_LABELS[level]);
}

export function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value).trim();
  return text;
}

export function splitAddress(address: string | null | undefined): {
  postal: string;
  body: string;
} {
  if (!address?.trim()) {
    return { postal: "", body: "" };
  }
  const normalized = address.trim();
  const match = normalized.match(/^〒?\s*(\d{3}-?\d{4})\s*(.*)$/u);
  if (!match) {
    return { postal: "", body: normalized };
  }
  const digits = match[1]?.replace("-", "") ?? "";
  const postal =
    digits.length === 7
      ? `〒${digits.slice(0, 3)}-${digits.slice(3)}`
      : `〒${match[1]}`;
  return { postal, body: match[2]?.trim() ?? "" };
}

export function formatCurrencyYen(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  return `${value.toLocaleString("ja-JP")} 円`;
}
