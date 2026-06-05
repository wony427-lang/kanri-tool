/** 必須項目ラベル横に表示する赤いアスタリスク */
export function RequiredMark() {
  return (
    <span className="ml-0.5 text-error" aria-hidden="true">
      *
    </span>
  );
}
