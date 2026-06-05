"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "./cn";

export type ToastVariant = "default" | "success" | "error" | "warning";

export interface ToastInput {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastInput, "message">> {
  id: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (input: ToastInput) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;

function toastRole(variant: ToastVariant): "status" | "alert" {
  return variant === "error" || variant === "warning" ? "alert" : "status";
}

const variantClasses: Record<ToastVariant, string> = {
  default: "border-muted-foreground/30 bg-background text-foreground",
  success: "border-success bg-success text-success-foreground",
  error: "border-error bg-error text-error-foreground",
  warning: "border-warning bg-warning text-warning-foreground",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      message,
      variant = "default",
      durationMs = DEFAULT_DURATION_MS,
    }: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [
        ...current,
        { id, message, variant, durationMs },
      ]);
    },
    [],
  );

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

function ToastItemView({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.durationMs]);

  return (
    <div
      role={toastRole(toast.variant)}
      aria-live={toastRole(toast.variant) === "alert" ? "assertive" : "polite"}
      className={cn(
        "rounded-md border px-4 py-3 text-sm shadow-md",
        "transition-opacity motion-reduce:transition-none",
        variantClasses[toast.variant],
      )}
    >
      {toast.message}
    </div>
  );
}

export function ToastViewport({ className }: { className?: string }) {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("ToastViewport must be used within ToastProvider");
  }

  return (
    <div
      aria-label="通知"
      className={cn(
        "pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2",
        className,
      )}
    >
      {context.toasts.map((toast) => (
        <ToastItemView
          key={toast.id}
          toast={toast}
          onDismiss={() => context.dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}

export function useToast(): Pick<ToastContextValue, "showToast"> {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return { showToast: context.showToast };
}
