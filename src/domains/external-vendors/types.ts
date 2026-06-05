import type { VendorType } from "@prisma/client";

export interface ExternalVendorKeyDetail {
  id: string;
  residentId: string;
  vendorType: VendorType;
  vendorName: string;
  uniqueKey: string;
  notes: string | null;
}

export interface VendorKeyInput {
  vendorType: VendorType;
  vendorName: string;
  uniqueKey: string;
  notes?: string;
}
