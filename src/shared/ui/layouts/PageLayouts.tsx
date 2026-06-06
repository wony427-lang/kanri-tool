import type { ReactNode } from "react";

const pageHeaderBleed =
  "-mx-4 px-4 pt-4 md:-mx-6 md:px-6 md:pt-6";

function PageHeader({
  title,
  subtitle,
  actions,
  sticky = false,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  sticky?: boolean;
}) {
  return (
    <div
      className={
        sticky
          ? `sticky top-0 z-10 flex flex-col gap-4 border-b border-muted-foreground/20 bg-background pb-4 shadow-sm md:flex-row md:items-start md:justify-between ${pageHeaderBleed}`
          : `flex flex-col gap-4 border-b border-muted-foreground/20 bg-background pb-4 md:flex-row md:items-start md:justify-between ${pageHeaderBleed}`
      }
    >
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function ListPage({
  title,
  subtitle,
  actions,
  filters,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {filters ? <div className="rounded-lg border border-muted-foreground/20 bg-muted/40 p-4">{filters}</div> : null}
      <div>{children}</div>
    </section>
  );
}

export function DetailPage({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        sticky
      />
      <div className="rounded-lg border border-muted-foreground/20 bg-background p-6 shadow-sm">
        {children}
      </div>
    </section>
  );
}

export function CreatePage({
  title,
  subtitle,
  actions,
  formChildren,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  formChildren: ReactNode;
  submitLabel?: string;
  cancelHref: string;
}) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="rounded-lg border border-muted-foreground/20 bg-background p-6 shadow-sm">
        {formChildren}
      </div>
    </section>
  );
}

export function EditPage(props: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  formChildren: ReactNode;
  submitLabel?: string;
  cancelHref: string;
}) {
  return <CreatePage {...props} />;
}
