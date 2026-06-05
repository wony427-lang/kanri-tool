import type { InputHTMLAttributes } from "react";

import { cn } from "./cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errorMessage?: string;
  invalid?: boolean;
}

export function Input({
  id,
  label,
  errorMessage,
  invalid,
  className,
  disabled,
  ...props
}: InputProps) {
  const describedBy = errorMessage ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        disabled={disabled}
        aria-disabled={disabled ? true : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none",
          invalid && "border-error focus-visible:ring-error",
          className,
        )}
        {...props}
      />
      {errorMessage ? (
        <p id={describedBy} className="text-sm text-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
