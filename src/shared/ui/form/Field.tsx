"use client";

import { cloneElement, isValidElement, useId } from "react";

import { cn } from "@/shared/ui/primitives/cn";

import { useOptionalFormContext } from "./context";
import { RequiredMark } from "./RequiredMark";
import type { FieldProps } from "./types";

function isControlRequired(children: FieldProps["children"]): boolean {
  if (!isValidElement<{ required?: boolean }>(children)) {
    return false;
  }
  return children.props.required === true;
}

export function Field({
  name,
  label,
  required,
  helperText,
  error,
  children,
}: FieldProps) {
  const form = useOptionalFormContext();
  const generatedId = useId();
  const fieldError = error ?? form?.errors?.fields?.[name];
  const isRequired = required ?? isControlRequired(children);
  const controlId =
    isValidElement<{ id?: string }>(children) && children.props.id
      ? children.props.id
      : generatedId;
  const describedBy = [
    helperText ? `${controlId}-help` : null,
    fieldError ? `${controlId}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const control = isValidElement<{
    id?: string;
    name?: string;
    "aria-invalid"?: boolean;
    "aria-required"?: boolean;
    "aria-describedby"?: string;
  }>(children)
    ? cloneElement(children, {
        id: controlId,
        name: children.props.name ?? name,
        "aria-invalid": fieldError ? true : children.props["aria-invalid"],
        "aria-required": isRequired ? true : children.props["aria-required"],
        "aria-describedby": describedBy || children.props["aria-describedby"],
      })
    : children;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={controlId} className="text-sm font-medium text-foreground">
        {label}
        {isRequired ? <RequiredMark /> : null}
      </label>
      <div
        className={cn(
          fieldError &&
            "[&_input]:border-error [&_input]:focus-visible:ring-error [&_select]:border-error [&_select]:focus-visible:ring-error [&_textarea]:border-error [&_textarea]:focus-visible:ring-error",
        )}
      >
        {control}
      </div>
      {helperText ? (
        <p id={`${controlId}-help`} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      ) : null}
      {fieldError ? (
        <p id={`${controlId}-error`} className="text-sm text-error" role="alert">
          {fieldError}
        </p>
      ) : null}
    </div>
  );
}
