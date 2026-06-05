export function PdfExportLink({ residentId }: { residentId: string }) {
  return (
    <a
      href={`/api/residents/${residentId}/pdf`}
      className="inline-flex rounded-md border border-muted-foreground/30 px-4 py-2 text-sm hover:bg-muted"
    >
      PDF 出力
    </a>
  );
}
