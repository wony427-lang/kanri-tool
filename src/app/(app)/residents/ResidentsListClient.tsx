"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { CARE_LEVEL_LABELS, USAGE_STATUS_LABELS } from "@/shared/domain/labels";
import type { ResidentListItem } from "@/domains/residents/types";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/ui/data-table";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";

interface FacilityOption {
  id: string;
  name: string;
}

import { PdfExportLink } from "./PdfExportLink";

const baseColumns: DataTableColumn<ResidentListItem>[] = [
  { key: "name", header: "利用者名", sortable: true },
  {
    key: "birthDate",
    header: "生年月日",
    sortable: true,
    render: (row) => row.birthDate.toLocaleDateString("ja-JP"),
  },
  { key: "age", header: "年齢", sortable: true },
  {
    key: "careLevel",
    header: "要介護度",
    sortable: true,
    render: (row) =>
      row.careLevel ? CARE_LEVEL_LABELS[row.careLevel] : "—",
  },
  { key: "facilityName", header: "所属施設", sortable: true },
  { key: "primaryDoctor", header: "主治医", sortable: true },
  { key: "careManagerName", header: "担当ケアマネ", sortable: true },
  {
    key: "usageStatus",
    header: "利用状況",
    sortable: true,
    render: (row) => USAGE_STATUS_LABELS[row.usageStatus],
  },
];

export function ResidentsListClient({
  items,
  total,
  facilities,
  canCreate,
  canExportPdf,
  page,
  pageSize,
  sortColumn,
  sortDirection,
}: {
  items: ResidentListItem[];
  total: number;
  facilities: FacilityOption[];
  canCreate: boolean;
  canExportPdf: boolean;
  page: number;
  pageSize: number;
  sortColumn: string;
  sortDirection: "asc" | "desc";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.push(`/residents?${params.toString()}`);
    });
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    updateParams({
      keyword: String(formData.get("keyword") ?? ""),
      careLevel: String(formData.get("careLevel") ?? ""),
      facilityId: String(formData.get("facilityId") ?? ""),
      primaryDoctor: String(formData.get("primaryDoctor") ?? ""),
      careManagerKeyword: String(formData.get("careManagerKeyword") ?? ""),
      usageStatus: String(formData.get("usageStatus") ?? ""),
      page: "1",
    });
  }

  const columns: DataTableColumn<ResidentListItem>[] = canExportPdf
    ? [
        ...baseColumns,
        {
          key: "id",
          header: "PDF",
          sortable: false,
          render: (row) => <PdfExportLink residentId={row.id} />,
        },
      ]
    : baseColumns;

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSearch}
        className="grid gap-4 rounded-lg border border-muted-foreground/20 bg-muted/40 p-4 md:grid-cols-3"
      >
        <Input
          name="keyword"
          placeholder="氏名・フリガナ"
          defaultValue={searchParams.get("keyword") ?? ""}
        />
        <select
          name="careLevel"
          defaultValue={searchParams.get("careLevel") ?? ""}
          className="rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
        >
          <option value="">要介護度（すべて）</option>
          {Object.entries(CARE_LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="facilityId"
          defaultValue={searchParams.get("facilityId") ?? ""}
          className="rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
        >
          <option value="">所属施設（すべて）</option>
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </select>
        <Input
          name="primaryDoctor"
          placeholder="主治医"
          defaultValue={searchParams.get("primaryDoctor") ?? ""}
        />
        <Input
          name="careManagerKeyword"
          placeholder="ケアマネ"
          defaultValue={searchParams.get("careManagerKeyword") ?? ""}
        />
        <select
          name="usageStatus"
          defaultValue={searchParams.get("usageStatus") ?? ""}
          className="rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
        >
          <option value="">利用状況（すべて）</option>
          {Object.entries(USAGE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className="md:col-span-3">
          <Button type="submit" disabled={pending}>
            {pending ? "検索中…" : "検索"}
          </Button>
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={items}
        loading={pending}
        emptyState={
          <div className="py-8 text-center text-sm">
            <p className="font-medium">該当する利用者はいません</p>
            <p className="mt-1 text-muted-foreground">
              検索条件を見直してください
            </p>
          </div>
        }
        pagination={{
          page,
          pageSize,
          totalCount: total,
          onPageChange: (next) => updateParams({ page: String(next) }),
        }}
        sort={{
          column: sortColumn,
          direction: sortDirection,
          onChange: (column) => {
            const nextDirection =
              sortColumn === column && sortDirection === "asc" ? "desc" : "asc";
            updateParams({
              sortColumn: column,
              sortDirection: nextDirection,
            });
          },
        }}
        onRowSelect={(row) => router.push(`/residents/${row.id}`)}
      />

      {canCreate ? (
        <div>
          <Button type="button" onClick={() => router.push("/residents/new")}>
            新規利用者登録
          </Button>
        </div>
      ) : null}
    </div>
  );
}
