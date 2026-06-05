"use client";

import { useState, useTransition } from "react";

import { requestStaffPasswordResetAction } from "@/domains/staff-accounts/actions";
import { Button } from "@/shared/ui/primitives/button";
import { useToast } from "@/shared/ui/primitives/toast";

export function PasswordResetButton({
  staffAccountId,
}: {
  staffAccountId: string;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClick() {
    startTransition(async () => {
      const result = await requestStaffPasswordResetAction(staffAccountId);
      if (result.ok) {
        setDone(true);
        showToast({
          message: "パスワードリセットメールを送信しました",
          variant: "success",
        });
      } else {
        showToast({ message: result.message, variant: "error" });
      }
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending || done}
      onClick={handleClick}
    >
      {done ? "送信済み" : pending ? "送信中…" : "パスワードリセット"}
    </Button>
  );
}
