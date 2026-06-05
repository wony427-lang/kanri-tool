"use client";

import { BoundaryError } from "@/shared/ui/layouts";

export default function BoundaryErrorFile({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <BoundaryError error={error} reset={reset} />;
}
