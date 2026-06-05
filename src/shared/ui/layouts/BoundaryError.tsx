"use client";

import Link from "next/link";

import { Button } from "@/shared/ui/primitives/button";

interface BoundaryErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function isForbiddenError(error: Error): boolean {
  return (
    error.name === "ForbiddenError" ||
    error.message.includes("権限がありません") ||
    error.message.includes("403")
  );
}

export function BoundaryError({ error, reset }: BoundaryErrorProps) {
  if (isForbiddenError(error)) {
    return (
      <section className="rounded-lg border border-muted-foreground/20 bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">権限がありません</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          この画面を表示する権限がありません。管理者にお問い合わせください。
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            一覧へ戻る
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-muted-foreground/20 bg-background p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">表示できませんでした</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        一時的な問題が発生しました。しばらくしてから再度お試しください。
      </p>
      <div className="mt-4">
        <Button type="button" variant="secondary" onClick={reset}>
          再試行
        </Button>
      </div>
    </section>
  );
}
