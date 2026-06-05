interface BoundaryLoadingProps {
  title?: string;
}

export function BoundaryLoading({ title }: BoundaryLoadingProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-4 rounded-lg border border-muted-foreground/20 bg-background p-6 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">
        {title ? `${title}を読み込み中` : "読み込み中"}
      </p>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            data-testid="boundary-skeleton-line"
            className="h-4 animate-pulse rounded bg-muted motion-reduce:animate-none"
          />
        ))}
      </div>
    </section>
  );
}
