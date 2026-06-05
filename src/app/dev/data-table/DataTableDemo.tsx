"use client";

import { useMemo, useState } from "react";

import { Button } from "@/shared/ui/primitives/button";

import {
  compareRows,
  cycleSortState,
  DataTable,
  type DataTableColumn,
  type SortState,
} from "@/shared/ui/data-table";

interface ResidentRow {
  id: string;
  name: string;
  facility: string;
  careLevel: string;
}

const allRows: ResidentRow[] = [
  { id: "1", name: "山田太郎", facility: "第一ホーム", careLevel: "要介護3" },
  { id: "2", name: "佐藤花子", facility: "第二ホーム", careLevel: "要介護2" },
  { id: "3", name: "鈴木一郎", facility: "第一ホーム", careLevel: "要介護1" },
  { id: "4", name: "田中次郎", facility: "第三ホーム", careLevel: "要介護4" },
  { id: "5", name: "伊藤美咲", facility: "第二ホーム", careLevel: "要介護2" },
  { id: "6", name: "渡辺健", facility: "第一ホーム", careLevel: "要支援1" },
];

const columns: DataTableColumn<ResidentRow>[] = [
  { key: "name", header: "氏名", sortable: true },
  { key: "facility", header: "所属施設", sortable: true },
  { key: "careLevel", header: "要介護度", sortable: true },
];

type DemoMode = "default" | "loading" | "empty" | "error";

type SortableColumn = keyof ResidentRow & string;

export function DataTableDemo() {
  const [mode, setMode] = useState<DemoMode>("default");
  const [sort, setSort] = useState<SortState>({});
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pageSize = 3;

  const sortedRows = useMemo(() => {
    if (!sort.column || !sort.direction) {
      return allRows;
    }
    return compareRows(allRows, sort.column as SortableColumn, sort.direction);
  }, [sort.column, sort.direction]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [page, sortedRows]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">
          DataTable デモ
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ソート・ページング・空状態・エラー再試行をモックデータで確認できます。
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["default", "通常"],
            ["loading", "読み込み中"],
            ["empty", "0件"],
            ["error", "エラー"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={mode === value ? "primary" : "secondary"}
            onClick={() => setMode(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={mode === "default" ? pagedRows : []}
        loading={mode === "loading"}
        emptyState={
          mode === "empty" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                データがありません
              </p>
              <Button type="button" variant="secondary">
                検索条件をクリア
              </Button>
            </div>
          ) : undefined
        }
        error={
          mode === "error"
            ? {
                message: "一覧の取得に失敗しました",
                onRetry: () => setMode("default"),
              }
            : undefined
        }
        sort={
          mode === "default"
            ? {
                column: sort.column ?? "",
                direction: sort.direction ?? "asc",
                onChange: (column) => {
                  setSort((current) => cycleSortState(current, column));
                  setPage(1);
                },
              }
            : undefined
        }
        pagination={
          mode === "default"
            ? {
                page,
                pageSize,
                totalCount: sortedRows.length,
                onPageChange: setPage,
              }
            : undefined
        }
        onRowSelect={(row) => setSelectedId(row.id)}
      />

      {selectedId ? (
        <p className="text-sm text-muted-foreground">
          選択中: {allRows.find((row) => row.id === selectedId)?.name}
        </p>
      ) : null}
    </div>
  );
}
