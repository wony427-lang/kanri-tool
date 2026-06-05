export function ThemeSample() {
  return (
    <section
      data-testid="theme-sample"
      className="rounded-lg bg-background p-6 text-foreground shadow-sm"
    >
      <h1 className="text-lg font-semibold">デザイントークン サンプル</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        OS のライト／ダーク設定に追従して表示されます。
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <p data-testid="primary-text" className="text-primary">
          text-primary — 主要アクション・リンク
        </p>

        <div
          data-testid="muted-surface"
          className="rounded-md bg-muted p-4 text-muted-foreground"
        >
          bg-muted — 補助背景
        </div>

        <span
          data-testid="success-badge"
          className="inline-flex w-fit rounded-md bg-success px-3 py-1 text-sm text-success-foreground"
        >
          成功
        </span>

        <span
          data-testid="warning-badge"
          className="inline-flex w-fit rounded-md bg-warning px-3 py-1 text-sm text-warning-foreground"
        >
          警告
        </span>

        <span
          data-testid="error-badge"
          className="inline-flex w-fit rounded-md bg-error px-3 py-1 text-sm text-error-foreground"
        >
          エラー
        </span>
      </div>
    </section>
  );
}
