import type { Role } from "@/shared/authorization/types";

export interface StaffAccountSummary {
  id: string;
  displayName: string;
  loginId: string;
  email: string;
  role: Role;
  isActive: boolean;
  facilityIds: string[];
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface StaffAccountDetail extends StaffAccountSummary {
  authUserId: string;
}

export interface CreateStaffAccountInput {
  displayName: string;
  loginId: string;
  email: string;
  password: string;
  role: Role;
  facilityIds: string[];
}

export interface UpdateStaffAccountInput {
  displayName: string;
  email: string;
  role: Role;
  facilityIds: string[];
  isActive: boolean;
}

export interface StaffAccountRepository {
  list(): Promise<StaffAccountSummary[]>;
  findById(id: string): Promise<StaffAccountDetail | null>;
  findByLoginId(loginId: string): Promise<StaffAccountDetail | null>;
  findByEmail(email: string): Promise<StaffAccountDetail | null>;
  countActiveAdmins(excludeId?: string): Promise<number>;
  create(input: {
    authUserId: string;
    displayName: string;
    loginId: string;
    email: string;
    role: Role;
    facilityIds: string[];
    createdBy: string;
  }): Promise<StaffAccountDetail>;
  update(
    id: string,
    input: {
      displayName: string;
      email: string;
      role: Role;
      facilityIds: string[];
      isActive: boolean;
      updatedBy: string;
    },
  ): Promise<StaffAccountDetail>;
}
