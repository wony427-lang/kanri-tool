import Link from "next/link";

export default function DevIndexPage() {
  return (
    <div className="min-h-full bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-semibold">開発デモ</h1>
        <ul className="flex flex-col gap-3 text-primary">
          <li>
            <Link href="/dev/theme" className="underline underline-offset-4">
              デザイントークン（/dev/theme）
            </Link>
          </li>
          <li>
            <Link href="/dev/ui" className="underline underline-offset-4">
              UI プリミティブ（/dev/ui）
            </Link>
          </li>
          <li>
            <Link href="/dev/data-table" className="underline underline-offset-4">
              DataTable（/dev/data-table）
            </Link>
          </li>
          <li>
            <Link href="/dev/form" className="underline underline-offset-4">
              Form（/dev/form）
            </Link>
          </li>
          <li>
            <Link href="/dev/layouts" className="underline underline-offset-4">
              ページレイアウト（/dev/layouts）
            </Link>
          </li>
          <li>
            <Link href="/dev/boundary" className="underline underline-offset-4">
              境界コンポーネント（/dev/boundary）
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
