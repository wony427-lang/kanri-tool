import Link from "next/link";

export default function BoundaryDemoPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">境界コンポーネント デモ</h1>
      <p className="text-sm text-muted-foreground">
        loading / error 境界の動作確認用ルートです。
      </p>
      <ul className="flex flex-col gap-2 text-primary">
        <li>
          <Link href="/dev/boundary/loading" className="underline underline-offset-4">
            ローディング（/dev/boundary/loading）
          </Link>
        </li>
        <li>
          <Link
            href="/dev/boundary/error?fail=1"
            className="underline underline-offset-4"
          >
            エラー（/dev/boundary/error?fail=1）
          </Link>
        </li>
        <li>
          <Link
            href="/dev/boundary/error?fail=forbidden"
            className="underline underline-offset-4"
          >
            403 エラー（/dev/boundary/error?fail=forbidden）
          </Link>
        </li>
      </ul>
    </section>
  );
}
