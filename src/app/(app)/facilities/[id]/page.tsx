import Link from "next/link";
import { notFound } from "next/navigation";

import { getFacilityAction } from "@/domains/facilities/actions";
import { DetailPage } from "@/shared/ui/layouts";

export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const facility = await getFacilityAction(id);
  if (!facility) {
    notFound();
  }

  return (
    <DetailPage
      title={facility.name}
      subtitle="施設詳細"
      actions={
        <Link
          href={`/facilities/${id}/edit`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          編集
        </Link>
      }
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">施設名</dt>
          <dd className="font-medium">{facility.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">利用状態</dt>
          <dd className="font-medium">
            {facility.isActive ? "利用中" : "利用停止"}
          </dd>
        </div>
      </dl>
    </DetailPage>
  );
}
