import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T extends { id: string }> {
  columns: ReadonlyArray<DataTableColumn<T>>;
  rows: ReadonlyArray<T>;
  loading?: boolean;
  emptyState?: ReactNode;
  error?: { message: string; onRetry?: () => void };
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (next: number) => void;
  };
  onRowSelect?: (row: T) => void;
  sort?: {
    column: string;
    direction: "asc" | "desc";
    onChange: (column: string) => void;
  };
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  column?: string;
  direction?: SortDirection;
}

export function cycleSortState(current: SortState, column: string): SortState {
  if (current.column !== column) {
    return { column, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { column, direction: "desc" };
  }
  return {};
}

export function compareRows<T>(
  rows: ReadonlyArray<T>,
  column: keyof T & string,
  direction: SortDirection,
): T[] {
  const sorted = [...rows];
  sorted.sort((left, right) => {
    const a = left[column];
    const b = right[column];

    if (typeof a === "number" && typeof b === "number") {
      return direction === "asc" ? a - b : b - a;
    }

    const leftValue = String(a ?? "");
    const rightValue = String(b ?? "");
    const result = leftValue.localeCompare(rightValue, "ja");
    return direction === "asc" ? result : -result;
  });
  return sorted;
}
