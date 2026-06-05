"use client";

import { useState } from "react";

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

function ToastDemo() {
  const { showToast } = useToast();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => showToast({ message: "処理を開始しました" })}
      >
        情報 Toast
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          showToast({ message: "保存しました", variant: "success" })
        }
      >
        成功 Toast
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          showToast({ message: "入力内容を確認してください", variant: "warning" })
        }
      >
        警告 Toast
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          showToast({ message: "保存に失敗しました", variant: "error" })
        }
      >
        エラー Toast
      </Button>
    </div>
  );
}

export function PrimitivesDemo() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState("active");

  return (
    <ToastProvider>
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-10">
        <header>
          <h1 className="text-2xl font-semibold text-foreground">
            UI プリミティブ デモ
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tab / Enter / Esc のみで各コンポーネントを操作できます。
          </p>
        </header>

        <section aria-labelledby="button-heading">
          <h2 id="button-heading" className="text-lg font-semibold">
            Button
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button">Primary</Button>
            <Button type="button" variant="secondary">
              Secondary
            </Button>
            <Button type="button" variant="ghost">
              Ghost
            </Button>
            <Button type="button" variant="destructive">
              Destructive
            </Button>
            <Button type="button" disabled>
              Disabled
            </Button>
          </div>
        </section>

        <section aria-labelledby="field-heading">
          <h2 id="field-heading" className="text-lg font-semibold">
            Input / Select
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input id="demo-name" label="氏名" placeholder="山田 太郎" />
            <Select
              id="demo-status"
              label="利用状況"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "active", label: "入居中" },
                { value: "scheduled", label: "入居予定" },
                { value: "discharged", label: "退去済み" },
              ]}
            />
          </div>
        </section>

        <section aria-labelledby="modal-heading">
          <h2 id="modal-heading" className="text-lg font-semibold">
            Modal / ConfirmDialog
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setModalOpen(true)}>
              モーダルを開く
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              削除確認
            </Button>
          </div>
        </section>

        <section aria-labelledby="toast-heading">
          <h2 id="toast-heading" className="text-lg font-semibold">
            Toast
          </h2>
          <div className="mt-4">
            <ToastDemo />
          </div>
        </section>
      </div>

      <Modal
        open={modalOpen}
        title="モーダル例"
        onClose={() => setModalOpen(false)}
      >
        <p className="text-sm text-muted-foreground">
          Esc キーまたは「閉じる」でダイアログを閉じられます。
        </p>
        <Button type="button" onClick={() => setModalOpen(false)}>
          閉じる
        </Button>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="利用者を削除"
        description="この操作は取り消せません。本当に削除しますか？"
        confirmLabel="削除する"
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />

      <ToastViewport />
    </ToastProvider>
  );
}
