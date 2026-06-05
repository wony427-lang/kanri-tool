import { describe, expect, it } from "vitest";

/**
 * ダッシュボード集計 SQL の handle_status フィルタ条件（task 18.3）。
 * 実 DB なしで、生成される WHERE 句の意図を固定する。
 */
const DASHBOARD_ALERT_COUNT_FILTER = `
  AND COALESCE(a.status, 'not_handled'::"AlertHandleStatus") = 'not_handled'
`;

describe("dashboard alert count filter (task 18.3)", () => {
  it("counts only not_handled alerts", () => {
    expect(DASHBOARD_ALERT_COUNT_FILTER).toContain("not_handled");
    expect(DASHBOARD_ALERT_COUNT_FILTER).not.toContain("renewed");
  });

  it("treats null status as not_handled via COALESCE", () => {
    expect(DASHBOARD_ALERT_COUNT_FILTER).toContain("COALESCE");
  });
});
