import type { ReactNode } from "react";

export interface FormErrors {
  form?: string;
  fields?: Record<string, string>;
}

export type FormActionResult =
  | { ok: true }
  | { ok: false; errors: FormErrors };

export interface FormProps {
  action: (formData: FormData) => Promise<FormActionResult>;
  children: ReactNode;
  submitLabel?: string;
  successMessage?: string;
  cancelHref?: string;
  cancelLabel?: string;
  onSuccess?: () => void;
}

export interface FieldProps {
  name: string;
  label: string;
  /** 必須項目のときラベル横に赤い * を表示する */
  required?: boolean;
  helperText?: string;
  error?: string;
  children: ReactNode;
}

export interface FormContextValue {
  errors?: FormErrors;
  pending: boolean;
}
