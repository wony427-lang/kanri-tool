"use client";

import type { KeyboardEvent, ReactNode } from "react";

import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/primitives/cn";

import type { DataTableColumn, DataTableProps } from "./types";

const SKELETON_ROW_COUNT = 5;

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction?: "asc" | "desc";
}) {
  if (!active || !direction) {
    return null;
  }

  return (
    <span aria-hidden="true" className="ml-1 text-muted-foreground">
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
}

function DefaultEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="text-sm font-medium text-foreground">データがありません</p>
      <p className="text-sm text-muted-foreground">
        検索条件を変更するか、新規データを追加してください。
      </p>
    </div>
  );
}

function SkeletonRows<T>({ columns }: { columns: ReadonlyArray<DataTableColumn<T>> }) {
  return Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
    <tr
      key={`skeleton-${index}`}
      data-testid="data-table-skeleton-row"
      className="border-t border-muted-foreground/20"
    >
      {columns.map((column) => (
        <td key={column.key} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </td>
      ))}
    </tr>
  ));
}

function PaginationBar({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: NonNullable<DataTableProps<{ id: string }>["pagination"]>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-muted-foreground/20 px-4 py-3 text-sm text-muted-foreground">
      <p>
        {totalCount}件中 {start}-{end}件
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="前のページ"
        >
          前へ
        </Button>
        <span aria-live="polite">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="次のページ"
        >
          次へ
        </Button>
      </div>
    </div>
  );
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading = false,
  emptyState,
  error,
  pagination,
  onRowSelect,
  sort,
}: DataTableProps<T>) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (!onRowSelect) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowSelect(row);
    }
  }

  function renderBody(): ReactNode {
    if (error) {
      return (
        <tr className="border-t border-muted-foreground/20">
          <td colSpan={columns.length} className="px-4 py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-error">{error.message}</p>
              {error.onRetry ? (
                <Button type="button" variant="secondary" onClick={error.onRetry}>
                  再試行
                </Button>
              ) : null}
            </div>
          </td>
        </tr>
      );
    }

    if (loading) {
      return <SkeletonRows columns={columns} />;
    }

    if (rows.length === 0) {
      return (
        <tr className="border-t border-muted-foreground/20">
          <td colSpan={columns.length} className="px-4 py-2">
            {emptyState ?? <DefaultEmptyState />}
          </td>
        </tr>
      );
    }

    return rows.map((row) => {
      const rowLabel = columns
        .map((column) => {
          const value = row[column.key];
          return column.render ? String(column.render(row)) : String(value ?? "");
        })
        .join(" ");

      return (
        <tr
          key={row.id}
          tabIndex={onRowSelect ? 0 : undefined}
          aria-label={onRowSelect ? rowLabel : undefined}
          className={cn(
            "border-t border-muted-foreground/20",
            onRowSelect &&
              "cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          )}
          onClick={onRowSelect ? () => onRowSelect(row) : undefined}
          onKeyDown={
            onRowSelect ? (event) => handleRowKeyDown(event, row) : undefined
          }
        >
          {columns.map((column) => (
            <td key={column.key} className="px-4 py-3 text-sm text-foreground">
              {column.render ? column.render(row) : String(row[column.key] ?? "")}
            </td>
          ))}
        </tr>
      );
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-muted-foreground/30 bg-background shadow-sm">
      <table className="min-w-full border-collapse">
        <thead className="bg-muted">
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.column === column.key;
              const ariaSort = isSorted
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : column.sortable
                  ? "none"
                  : undefined;

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className="px-4 py-3 text-left text-sm font-semibold text-foreground"
                >
                  {column.sortable && sort ? (
                    <button
                      type="button"
                      className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => sort.onChange(column.key)}
                    >
                      {column.header}
                      <SortIndicator
                        active={isSorted}
                        direction={isSorted ? sort.direction : undefined}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{renderBody()}</tbody>
      </table>
      {pagination ? <PaginationBar {...pagination} /> : null}
    </div>
  );
}
