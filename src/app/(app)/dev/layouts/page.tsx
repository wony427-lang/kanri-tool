import Link from "next/link";

import { Button } from "@/shared/ui/primitives/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import {
  CreatePage,
  DetailPage,
  EditPage,
  ListPage,
} from "@/shared/ui/layouts";

interface ResidentRow {
  id: string;
  name: string;
  facility: string;
}

const rows: ResidentRow[] = [
  { id: "1", name: "山田太郎", facility: "第一ホーム" },
  { id: "2", name: "佐藤花子", facility: "第二ホーム" },
];

const columns: DataTableColumn<ResidentRow>[] = [
  { key: "name", header: "氏名" },
  { key: "facility", header: "所属施設" },
];

export default function LayoutSamplesPage() {
  return (
    <div className="flex flex-col gap-12">
      <header>
        <h1 className="text-2xl font-semibold">ページレイアウト サンプル</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          List / Detail / Create / Edit テンプレートの表示例です。
        </p>
      </header>

      <ListPage
        title="利用者一覧"
        subtitle="所属施設の利用者"
        actions={<Button type="button">新規作成</Button>}
        filters={
          <label className="flex flex-col gap-1 text-sm">
            氏名検索
            <input
              aria-label="氏名検索"
              className="rounded-md border border-muted-foreground/30 px-3 py-2"
              placeholder="山田"
            />
          </label>
        }
      >
        <DataTable columns={columns} rows={rows} />
      </ListPage>

      <DetailPage
        title="山田太郎"
        subtitle="第一ホーム / 要介護3"
        actions={
          <>
            <Button type="button" variant="secondary">
              PDF 出力
            </Button>
            <Button type="button">編集</Button>
          </>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">生年月日</dt>
            <dd>1945-04-12</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">利用状況</dt>
            <dd>入居中</dd>
          </div>
        </dl>
      </DetailPage>

      <CreatePage
        title="利用者を登録"
        subtitle="必須項目を入力してください"
        cancelHref="/dev/layouts"
        formChildren={
          <form className="flex flex-col gap-4">
            <label className="text-sm">
              氏名
              <input className="mt-1 w-full rounded-md border border-muted-foreground/30 px-3 py-2" />
            </label>
            <div className="flex gap-2">
              <Button type="button">保存</Button>
              <Link href="/dev/layouts" className="rounded-md border px-4 py-2 text-sm">
                キャンセル
              </Link>
            </div>
          </form>
        }
      />

      <EditPage
        title="利用者を編集"
        subtitle="山田太郎"
        cancelHref="/dev/layouts"
        formChildren={
          <form className="flex flex-col gap-4">
            <label className="text-sm">
              氏名
              <input
                defaultValue="山田太郎"
                className="mt-1 w-full rounded-md border border-muted-foreground/30 px-3 py-2"
              />
            </label>
            <div className="flex gap-2">
              <Button type="button">更新</Button>
              <Link href="/dev/layouts" className="rounded-md border px-4 py-2 text-sm">
                キャンセル
              </Link>
            </div>
          </form>
        }
      />
    </div>
  );
}
