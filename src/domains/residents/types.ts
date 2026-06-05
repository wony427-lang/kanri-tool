import type { CareLevel, UsageStatus } from "@prisma/client";

export interface ResidentListItem {
  id: string;
  name: string;
  birthDate: Date;
  age: number;
  careLevel: CareLevel | null;
  facilityId: string;
  facilityName: string;
  primaryDoctor: string | null;
  careManagerName: string | null;
  usageStatus: UsageStatus;
}

export interface EmergencyContactDetail {
  sortOrder: number;
  name: string;
  relationship: string | null;
  address: string | null;
  phone: string | null;
  mobile: string | null;
}

export interface MedicalCareDetail {
  medicalFacilityName: string | null;
  primaryDoctor: string | null;
  emergencyHospital: string | null;
  emergencyHospital2: string | null;
  careOffice: string | null;
  careOfficePhone: string | null;
  careOfficeLicenseNo: string | null;
  careManagerName: string | null;
}

export interface ResidentDetail {
  id: string;
  facilityId: string;
  facilityName: string;
  name: string;
  nameKana: string;
  birthDate: Date;
  age: number;
  gender: string;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  moveInDate: Date | null;
  moveOutDate: Date | null;
  usageStatus: UsageStatus;
  medicalHistory: string | null;
  notes: string | null;
  medicalCare: MedicalCareDetail | null;
  emergencyContacts: EmergencyContactDetail[];
  careLevel: CareLevel | null;
}

export interface ResidentSearchQuery {
  keyword?: string;
  careLevel?: CareLevel;
  facilityId?: string;
  primaryDoctor?: string;
  careManagerKeyword?: string;
  usageStatus?: UsageStatus;
  pagination: { offset: number; limit: number };
  sort: { column: keyof ResidentListItem; direction: "asc" | "desc" };
}

export interface CreateResidentInput {
  facilityId: string;
  name: string;
  nameKana: string;
  birthDate: string;
  gender: string;
  address?: string;
  phone?: string;
  mobile?: string;
  moveInDate?: string;
  moveOutDate?: string;
  usageStatus: UsageStatus;
}

export type UpdateResidentInput = CreateResidentInput;

export interface ResidentRepository {
  search(params: {
    facilityIds: ReadonlyArray<string>;
    keyword?: string;
    careLevel?: CareLevel;
    facilityId?: string;
    primaryDoctor?: string;
    careManagerKeyword?: string;
    usageStatus?: UsageStatus;
    pagination: { offset: number; limit: number };
    sort: { column: keyof ResidentListItem; direction: "asc" | "desc" };
  }): Promise<{ items: ResidentListItem[]; total: number }>;

  findById(
    id: string,
    facilityIds: ReadonlyArray<string>,
  ): Promise<ResidentDetail | null>;

  findByIdUnscoped(id: string): Promise<ResidentDetail | null>;

  create(input: {
    facilityId: string;
    name: string;
    nameKana: string;
    birthDate: Date;
    gender: string;
    address: string | null;
    phone: string | null;
    mobile: string | null;
    moveInDate: Date | null;
    moveOutDate: Date | null;
    usageStatus: UsageStatus;
    createdBy: string;
  }): Promise<ResidentDetail>;

  update(
    id: string,
    input: {
      facilityId: string;
      name: string;
      nameKana: string;
      birthDate: Date;
      gender: string;
      address: string | null;
      phone: string | null;
      mobile: string | null;
      moveInDate: Date | null;
      moveOutDate: Date | null;
      usageStatus: UsageStatus;
      updatedBy: string;
    },
  ): Promise<ResidentDetail>;

  delete(id: string): Promise<void>;
}
