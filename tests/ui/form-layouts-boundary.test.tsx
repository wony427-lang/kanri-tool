import type { ReactElement } from "react";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createFakeSession } from "@test/utils/fakeSession";
import { filterNavigationItems, navigationItems } from "@/shared/nav/navigation";
import { ToastProvider, ToastViewport } from "@/shared/ui/primitives";
import {
  Field,
  Form,
  type FormActionResult,
} from "@/shared/ui/form";
import { DetailPage, ListPage } from "@/shared/ui/layouts/PageLayouts";
import { BoundaryError } from "@/shared/ui/layouts/BoundaryError";
import { BoundaryLoading } from "@/shared/ui/layouts/BoundaryLoading";

function renderWithToast(ui: ReactElement) {
  return render(
    <ToastProvider>
      {ui}
      <ToastViewport />
    </ToastProvider>,
  );
}

describe("Form (task 3.4)", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a red required marker on required fields", () => {
    const { rerender } = render(
      <Field name="name" label="氏名" required>
        <input name="name" />
      </Field>,
    );
    expect(screen.getByText("*")).toHaveClass("text-error");

    rerender(
      <Field name="email" label="メール">
        <input name="email" required />
      </Field>,
    );
    expect(screen.getByText("*")).toHaveClass("text-error");
  });

  it("shows field-level validation errors from the server action", async () => {
    const action = vi.fn(
      async (): Promise<FormActionResult> => ({
        ok: false,
        errors: { fields: { name: "氏名は必須です" } },
      }),
    );

    renderWithToast(
      <Form action={action} submitLabel="保存">
        <Field name="name" label="氏名">
          <input id="name" name="name" defaultValue="" />
        </Field>
      </Form>,
    );

    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.getByText("氏名は必須です")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("氏名")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a form-level error message", async () => {
    const action = vi.fn(
      async (): Promise<FormActionResult> => ({
        ok: false,
        errors: { form: "保存に失敗しました" },
      }),
    );

    renderWithToast(
      <Form action={action}>
        <Field name="name" label="氏名">
          <input id="name" name="name" />
        </Field>
      </Form>,
    );

    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("保存に失敗しました");
    });
  });

  it("disables submit while the action is pending", async () => {
    let resolveAction: (value: FormActionResult) => void = () => undefined;
    const action = vi.fn(
      () =>
        new Promise<FormActionResult>((resolve) => {
          resolveAction = resolve;
        }),
    );

    renderWithToast(
      <Form action={action} submitLabel="保存">
        <Field name="name" label="氏名">
          <input id="name" name="name" />
        </Field>
      </Form>,
    );

    fireEvent.submit(screen.getByRole("form"));
    expect(screen.getByRole("button", { name: "送信中..." })).toBeDisabled();

    await act(async () => {
      resolveAction({ ok: true });
    });
  });

  it("shows a success toast after a successful submit", async () => {
    const action = vi.fn(
      async (): Promise<FormActionResult> => ({ ok: true }),
    );

    renderWithToast(
      <Form action={action} successMessage="保存しました">
        <Field name="name" label="氏名">
          <input id="name" name="name" />
        </Field>
      </Form>,
    );

    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("保存しました");
    });
  });
});

describe("Navigation (task 3.5)", () => {
  it("filters navigation items by role", () => {
    const viewerItems = filterNavigationItems(
      navigationItems,
      createFakeSession({ role: "viewer" }),
    );
    const adminItems = filterNavigationItems(
      navigationItems,
      createFakeSession({ role: "admin" }),
    );

    expect(viewerItems.map((item) => item.href)).not.toContain("/staff-accounts");
    expect(adminItems.map((item) => item.href)).toContain("/staff-accounts");
  });
});

describe("Page layouts (task 3.6)", () => {
  it("renders list page regions", () => {
    render(
      <ListPage
        title="利用者一覧"
        subtitle="所属施設の利用者"
        actions={<button type="button">新規作成</button>}
        filters={<input aria-label="氏名検索" />}
      >
        <p>table slot</p>
      </ListPage>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "利用者一覧" })).toBeInTheDocument();
    expect(screen.getByText("所属施設の利用者")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
    expect(screen.getByLabelText("氏名検索")).toBeInTheDocument();
    expect(screen.getByText("table slot")).toBeInTheDocument();
  });

  it("renders detail page actions", () => {
    render(
      <DetailPage
        title="山田太郎"
        subtitle="第一ホーム"
        actions={<button type="button">編集</button>}
      >
        <p>detail body</p>
      </DetailPage>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "山田太郎" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "編集" })).toBeInTheDocument();
  });
});

describe("Boundary components (task 3.7)", () => {
  it("renders a loading skeleton", () => {
    render(<BoundaryLoading title="利用者一覧" />);
    expect(screen.getByRole("status")).toHaveTextContent("読み込み中");
    expect(screen.getAllByTestId("boundary-skeleton-line").length).toBeGreaterThan(0);
  });

  it("renders a safe error fallback with retry", () => {
    const reset = vi.fn();
    render(
      <BoundaryError
        error={new Error("database secret stack trace")}
        reset={reset}
      />,
    );

    expect(screen.getByText("表示できませんでした")).toBeInTheDocument();
    expect(screen.queryByText(/stack trace/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders a forbidden fallback for authorization errors", () => {
    const error = new Error("権限がありません");
    error.name = "ForbiddenError";

    render(<BoundaryError error={error} reset={() => undefined} />);

    expect(screen.getByText("権限がありません")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "一覧へ戻る" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
