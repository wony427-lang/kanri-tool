import { describe, expect, it } from "vitest";

import {
  addYears,
  calculateNextBillingDate,
  classifyAlertBucket,
} from "@/shared/domain/date";

describe("addYears (task 9.1)", () => {
  it("adds one year on a normal date", () => {
    const base = new Date("2024-03-15");
    expect(addYears(base, 1).toISOString().slice(0, 10)).toBe("2025-03-15");
  });

  it("handles leap day to non-leap year as Feb 28", () => {
    const base = new Date(2024, 1, 29);
    const result = addYears(base, 1);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
  });

  it("handles month-end crossing", () => {
    const base = new Date("2023-01-31");
    expect(addYears(base, 1).toISOString().slice(0, 10)).toBe("2024-01-31");
  });

  it("calculateNextBillingDate returns base + 1 year", () => {
    const base = new Date("2025-06-01");
    expect(calculateNextBillingDate(base).toISOString().slice(0, 10)).toBe(
      "2026-06-01",
    );
  });
});

describe("classifyAlertBucket (task 10.1)", () => {
  it.each([
    [-1, "expired"],
    [0, "within_30"],
    [30, "within_30"],
    [31, "within_60"],
    [60, "within_60"],
    [61, "within_90"],
    [90, "within_90"],
    [91, null],
  ] as const)("remainingDays=%i → %s", (remainingDays, expected) => {
    expect(classifyAlertBucket(remainingDays)).toBe(expected);
  });
});
