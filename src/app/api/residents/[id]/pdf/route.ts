import { NextResponse } from "next/server";

import { renderResidentProfilePdf } from "@/domains/pdf-export/service";
import { ForbiddenError, UnauthenticatedError } from "@/shared/authorization/errors";
import { requireSession } from "@/shared/authorization/service";

function clientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")
  );
}

function pdfFilename(residentId: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `resident-${residentId}-${date}.pdf`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const result = await renderResidentProfilePdf(id, session, clientIp(request));

    if (!result.ok) {
      const status = result.error.name === "NotFoundError" ? 404 : 403;
      return NextResponse.json({ error: result.error.message }, { status });
    }

    return new NextResponse(Buffer.from(result.value), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename(id)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "内部エラー" }, { status: 500 });
  }
}
