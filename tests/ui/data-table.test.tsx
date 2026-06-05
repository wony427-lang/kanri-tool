import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "@/shared/ui/data-table";
import type { DataTableColumn } from "@/shared/ui/data-table";

interface DemoRow {
  id: string;
  name: string;
  age: number;
}

const columns: DataTableColumn<DemoRow>[] = [
  { key: "name", header: "氏名", sortable: true },
  { key: "age", header: "年齢", sortable: true },
];

const rows: DemoRow[] = [
  { id: "1", name: "山田太郎", age: 80 },
  { id: "2", name: "佐藤花子", age: 75 },
];

describe("DataTable (task 3.3)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders column headers and row cells from props", () => {
    render(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByRole("columnheader", { name: "氏名" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "年齢" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "山田太郎" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "75" })).toBeInTheDocument();
  });

  it("requests sort changes when a sortable header is clicked", () => {
    const onChange = vi.fn();

    render(
      <DataTable
        columns={columns}
        rows={rows}
        sort={{ column: "name", direction: "asc", onChange }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "氏名" }));
    expect(onChange).toHaveBeenCalledWith("name");
  });

  it("shows skeleton rows while loading", () => {
    render(<DataTable columns={columns} rows={[]} loading />);

    expect(screen.getByRole("columnheader", { name: "氏名" })).toBeInTheDocument();
    expect(screen.getAllByTestId("data-table-skeleton-row")).toHaveLength(5);
  });

  it("shows the default empty state when there are no rows", () => {
    render(<DataTable columns={columns} rows={[]} />);

    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  it("shows a custom empty state action", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        emptyState={
          <div>
            <p>データがありません</p>
            <button type="button">検索条件をクリア</button>
          </div>
        }
      />,
    );

    expect(
      screen.getByRole("button", { name: "検索条件をクリア" }),
    ).toBeInTheDocument();
  });

  it("shows an error message with retry while keeping headers", () => {
    const onRetry = vi.fn();

    render(
      <DataTable
        columns={columns}
        rows={[]}
        error={{ message: "読み込みに失敗しました", onRetry }}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "氏名" })).toBeInTheDocument();
    expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders pagination controls and notifies page changes", () => {
    const onPageChange = vi.fn();

    render(
      <DataTable
        columns={columns}
        rows={rows}
        pagination={{
          page: 2,
          pageSize: 10,
          totalCount: 25,
          onPageChange,
        }}
      />,
    );

    expect(screen.getByText("25件中 11-20件")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "前のページ" }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "次のページ" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("selects a row on click and Enter key", async () => {
    const user = userEvent.setup();
    const onRowSelect = vi.fn();

    render(
      <DataTable columns={columns} rows={rows} onRowSelect={onRowSelect} />,
    );

    const firstRow = screen.getByRole("row", { name: /山田太郎/ });
    await user.click(firstRow);
    expect(onRowSelect).toHaveBeenCalledWith(rows[0]);

    firstRow.focus();
    await user.keyboard("{Enter}");
    expect(onRowSelect).toHaveBeenCalledTimes(2);
  });

  it("reflects updated rows on each render without caching", () => {
    const { rerender } = render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByRole("cell", { name: "山田太郎" })).toBeInTheDocument();

    rerender(
      <DataTable
        columns={columns}
        rows={[{ id: "3", name: "鈴木一郎", age: 68 }]}
      />,
    );

    expect(screen.queryByRole("cell", { name: "山田太郎" })).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "鈴木一郎" })).toBeInTheDocument();
  });
});
