import { describe, expect, it } from "vitest";

import {
  formatPdfCareLevel,
  formatWarekiDate,
  formatWarekiPeriod,
  splitAddress,
} from "@/domains/pdf-export/format";

describe("pdf-export format helpers", () => {
  it("formats wareki dates with era name", () => {
    expect(formatWarekiDate(new Date(Date.UTC(2023, 9, 26)))).toBe(
      "令和 5 年 10 月 26 日",
    );
    expect(formatWarekiDate(new Date(Date.UTC(1944, 9, 26)))).toBe(
      "昭和 19 年 10 月 26 日",
    );
  });

  it("formats wareki periods without repeating era names", () => {
    expect(
      formatWarekiPeriod(
        new Date(Date.UTC(2023, 2, 23)),
        new Date(Date.UTC(2024, 2, 31)),
      ),
    ).toBe("5 年 3 月 23 日 ～ 6 年 3 月 31 日");
  });

  it("uses full-width digits for care level labels", () => {
    expect(formatPdfCareLevel("care3")).toBe("要介護３");
  });

  it("splits postal code from address", () => {
    expect(splitAddress("〒1000001 東京都千代田区")).toEqual({
      postal: "〒100-0001",
      body: "東京都千代田区",
    });
  });
});
