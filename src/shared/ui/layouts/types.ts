import type { ReactNode } from "react";

export interface BasePageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export interface ListPageProps extends BasePageProps {
  filters?: ReactNode;
}

export type DetailPageProps = BasePageProps;

export interface CreatePageProps extends BasePageProps {
  formChildren: ReactNode;
  submitLabel?: string;
  cancelHref: string;
}

export type EditPageProps = CreatePageProps;
