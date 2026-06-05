import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Button,
  ConfirmDialog,
  Input,
  Modal,
  Select,
  ToastProvider,
  ToastViewport,
  useToast,
} from "@/shared/ui/primitives";

function ToastTrigger({
  message,
  variant = "default" as const,
}: {
  message: string;
  variant?: "default" | "success" | "error" | "warning";
}) {
  const { showToast } = useToast();
  return (
    <Button
      type="button"
      onClick={() => showToast({ message, variant })}
    >
      Show toast
    </Button>
  );
}

describe("UI primitives (task 3.2)", () => {
  afterEach(() => {
    cleanup();
  });

  it("exports Button, Input, Select, Modal, and Toast utilities", () => {
    expect(Button).toBeDefined();
    expect(Input).toBeDefined();
    expect(Select).toBeDefined();
    expect(Modal).toBeDefined();
    expect(ToastProvider).toBeDefined();
    expect(ToastViewport).toBeDefined();
    expect(useToast).toBeDefined();
  });

  describe("Button", () => {
    it("marks disabled buttons with aria-disabled and blocks pointer events", () => {
      render(<Button disabled>保存</Button>);
      const button = screen.getByRole("button", { name: "保存" });
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveClass("pointer-events-none");
      expect(button).toBeDisabled();
    });

    it("provides a destructive variant", () => {
      render(<Button variant="destructive">削除</Button>);
      expect(screen.getByRole("button", { name: "削除" })).toHaveClass(
        "bg-error",
      );
    });

    it("shows a visible focus ring for keyboard users", () => {
      render(<Button>実行</Button>);
      expect(screen.getByRole("button", { name: "実行" })).toHaveClass(
        "focus-visible:ring-primary",
      );
    });
  });

  describe("Input", () => {
    it("associates label text and exposes aria-invalid when invalid", () => {
      render(
        <Input
          id="name"
          label="氏名"
          invalid
          errorMessage="必須項目です"
        />,
      );

      const input = screen.getByLabelText("氏名");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("必須項目です")).toBeInTheDocument();
    });
  });

  describe("Select", () => {
    it("supports keyboard selection via native select semantics", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <Select
          id="status"
          label="利用状況"
          value="active"
          onChange={onChange}
          options={[
            { value: "active", label: "入居中" },
            { value: "discharged", label: "退去済み" },
          ]}
        />,
      );

      const select = screen.getByLabelText("利用状況");
      await user.selectOptions(select, "discharged");
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("Modal", () => {
    it("traps focus within the dialog and closes on Escape", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <>
          <button type="button">Outside</button>
          <Modal open title="確認" onClose={onClose}>
            <Button type="button">First</Button>
            <Button type="button">Second</Button>
          </Modal>
        </>,
      );

      const first = screen.getByRole("button", { name: "First" });
      const second = screen.getByRole("button", { name: "Second" });
      expect(document.activeElement).toBe(first);

      await user.tab();
      expect(document.activeElement).toBe(second);

      await user.tab();
      expect(document.activeElement).toBe(first);

      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("suppresses motion-oriented classes when reduced motion is preferred", () => {
      render(
        <Modal open title="確認" onClose={() => undefined}>
          Content
        </Modal>,
      );

      expect(screen.getByRole("dialog")).toHaveClass("motion-reduce:transition-none");
    });
  });

  describe("Toast", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("auto-dismisses status toasts after the default duration", () => {
      render(
        <ToastProvider>
          <ToastTrigger message="保存しました" variant="success" />
          <ToastViewport />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Show toast" }));
      expect(screen.getByRole("status")).toHaveTextContent("保存しました");

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("uses role=alert for error toasts", () => {
      render(
        <ToastProvider>
          <ToastTrigger message="保存に失敗しました" variant="error" />
          <ToastViewport />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Show toast" }));

      expect(screen.getByRole("alert")).toHaveTextContent("保存に失敗しました");
    });
  });

  describe("ConfirmDialog", () => {
    it("pairs destructive confirmation with a modal dialog", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(
        <ConfirmDialog
          open
          title="利用者を削除"
          description="この操作は取り消せません。"
          confirmLabel="削除する"
          onConfirm={onConfirm}
          onCancel={() => undefined}
        />,
      );

      const confirmButton = screen.getByRole("button", { name: "削除する" });
      expect(confirmButton).toHaveClass("bg-error");

      await user.click(confirmButton);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
