"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/shared/ui/primitives/select";

export interface FacilityOption {
  id: string;
  name: string;
}

interface FacilityScopeSelectProps {
  facilities: ReadonlyArray<FacilityOption>;
}

function currentValue(
  scope: string | null,
  facilityId: string | null,
): string {
  if (scope === "all") {
    return "all";
  }
  if (facilityId) {
    return facilityId;
  }
  return "default";
}

export function FacilityScopeSelect({ facilities }: FacilityScopeSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = currentValue(
    searchParams.get("scope"),
    searchParams.get("facilityId"),
  );

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextValue = event.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("scope");
    params.delete("facilityId");
    params.delete("page");

    if (nextValue === "all") {
      params.set("scope", "all");
    } else if (nextValue !== "default") {
      params.set("facilityId", nextValue);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="w-44">
      <Select
        id="facility-scope"
        label="施設フィルタ"
        value={value}
        onChange={handleChange}
        options={[
          { value: "default", label: "全施設" },
          ...facilities.map((facility) => ({
            value: facility.id,
            label: facility.name,
          })),
        ]}
      />
    </div>
  );
}
