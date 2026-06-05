export default async function BoundaryLoadingDemoPage() {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return (
    <section>
      <h1 className="text-2xl font-semibold">ローディング完了</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        1.2 秒後にこの画面が表示されます。
      </p>
    </section>
  );
}
