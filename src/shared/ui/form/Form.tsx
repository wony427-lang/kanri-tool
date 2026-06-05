"use client";

import Link from "next/link";
import {
  useActionState,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Button } from "@/shared/ui/primitives/button";
import { ConfirmDialog } from "@/shared/ui/primitives/confirm-dialog";
import { useToast } from "@/shared/ui/primitives/toast";

import { FormContext } from "./context";
import type { FormActionResult, FormErrors, FormProps } from "./types";

interface FormState {
  errors?: FormErrors;
  ok?: boolean;
}

const initialState: FormState = {};

export function Form({
  action,
  children,
  submitLabel = "保存",
  successMessage = "保存しました",
  cancelHref,
  cancelLabel = "キャンセル",
  onSuccess,
}: FormProps) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_previous: FormState, formData: FormData): Promise<FormState> => {
      const result: FormActionResult = await action(formData);
      if (result.ok) {
        showToast({ message: successMessage, variant: "success" });
        setIsDirty(false);
        onSuccess?.();
        return { ok: true };
      }
      return { errors: result.errors };
    },
    initialState,
  );

  function handleInput(event: FormEvent<HTMLFormElement>) {
    setIsDirty(true);
    event.currentTarget.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function handleCancelClick(event: { preventDefault: () => void }) {
    if (!cancelHref) {
      return;
    }
    if (isDirty) {
      event.preventDefault();
      setCancelOpen(true);
    }
  }

  return (
    <FormContext.Provider value={{ errors: state.errors, pending }}>
      <form
        ref={formRef}
        action={formAction}
        role="form"
        className="flex flex-col gap-6"
        onInput={handleInput}
      >
        {state.errors?.form ? (
          <div
            role="alert"
            className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error"
          >
            {state.errors.form}
          </div>
        ) : null}

        <div className="flex flex-col gap-4">{children}</div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending} aria-disabled={pending}>
            {pending ? "送信中..." : submitLabel}
          </Button>
          {cancelHref ? (
            <Link
              href={cancelHref}
              onClick={handleCancelClick}
              className="inline-flex items-center justify-center rounded-md border border-muted-foreground/30 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {cancelLabel}
            </Link>
          ) : null}
        </div>
      </form>

      {cancelHref ? (
        <ConfirmDialog
          open={cancelOpen}
          title="変更を破棄"
          description="未保存の変更があります。破棄してよろしいですか？"
          confirmLabel="破棄する"
          onConfirm={() => {
            setCancelOpen(false);
            window.location.href = cancelHref;
          }}
          onCancel={() => setCancelOpen(false)}
        />
      ) : null}
    </FormContext.Provider>
  );
}
