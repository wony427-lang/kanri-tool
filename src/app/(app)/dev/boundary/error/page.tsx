interface BoundaryErrorDemoPageProps {
  searchParams: Promise<{ fail?: string }>;
}

export default async function BoundaryErrorDemoPage({
  searchParams,
}: BoundaryErrorDemoPageProps) {
  const params = await searchParams;

  if (params.fail === "forbidden") {
    const error = new Error("権限がありません");
    error.name = "ForbiddenError";
    throw error;
  }

  if (params.fail === "1") {
    throw new Error("database connection failed: secret-stack-trace");
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">エラー境界デモ</h1>
      <p className="text-sm text-muted-foreground">
        クエリ `?fail=1` または `?fail=forbidden` を付けてアクセスすると error
        境界が表示されます。
      </p>
    </section>
  );
}
