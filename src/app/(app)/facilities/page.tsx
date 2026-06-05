import Link from "next/link";

import { listFacilitiesAction } from "@/domains/facilities/actions";
import { ListPage } from "@/shared/ui/layouts";

import { FacilityListActions } from "./FacilityForm";

export default async function FacilitiesPage() {
  const facilities = await listFacilitiesAction();

  return (
    <ListPage title="施設管理" subtitle="施設マスタの一覧" actions={<FacilityListActions />}>
      <div className="overflow-x-auto rounded-lg border border-muted-foreground/20">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">施設名</th>
              <th className="px-4 py-3 text-left font-medium">状態</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((facility) => (
              <tr key={facility.id} className="border-t border-muted-foreground/20">
                <td className="px-4 py-3">{facility.name}</td>
                <td className="px-4 py-3">
                  {facility.isActive ? "利用中" : "利用停止"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/facilities/${facility.id}`}
                    className="inline-flex rounded-md border border-muted-foreground/30 px-3 py-1 text-sm hover:bg-muted"
                  >
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListPage>
  );
}
