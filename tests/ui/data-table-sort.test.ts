import { describe, expect, it } from "vitest";

import { compareRows, cycleSortState } from "@/shared/ui/data-table";

describe("data-table sort helpers", () => {
  it("cycles sort state asc -> desc -> clear", () => {
    expect(cycleSortState({}, "name")).toEqual({
      column: "name",
      direction: "asc",
    });
    expect(cycleSortState({ column: "name", direction: "asc" }, "name")).toEqual({
      column: "name",
      direction: "desc",
    });
    expect(
      cycleSortState({ column: "name", direction: "desc" }, "name"),
    ).toEqual({});
  });

  it("sorts rows by the selected column", () => {
    const rows = [
      { id: "1", name: "佐藤", age: 70 },
      { id: "2", name: "山田", age: 80 },
    ];

    expect(compareRows(rows, "name", "asc").map((row) => row.name)).toEqual([
      "佐藤",
      "山田",
    ]);
    expect(compareRows(rows, "age", "desc").map((row) => row.age)).toEqual([
      80, 70,
    ]);
  });
});
