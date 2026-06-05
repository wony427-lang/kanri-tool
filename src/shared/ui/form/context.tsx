"use client";

import { createContext, useContext } from "react";

import type { FormContextValue } from "./types";

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within Form");
  }
  return context;
}

export function useOptionalFormContext(): FormContextValue | null {
  return useContext(FormContext);
}
