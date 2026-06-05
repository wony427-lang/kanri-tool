import "server-only";

import type { CareLevel, Prisma, UsageStatus } from "@prisma/client";

import { calculateAge } from "@/shared/domain/age";
import { prisma } from "@/shared/db/prisma";

import type {
  EmergencyContactDetail,
  MedicalCareDetail,
  ResidentDetail,
  ResidentListItem,
  ResidentRepository,
} from "./types";

function toMedicalCare(
  row: {
    medicalFacilityName: string | null;
    primaryDoctor: string | null;
    emergencyHospital: string | null;
    emergencyHospital2: string | null;
    careOffice: string | null;
    careOfficePhone: string | null;
    careOfficeLicenseNo: string | null;
    careManagerName: string | null;
  } | null,
): MedicalCareDetail | null {
  if (!row) {
    return null;
  }
  return { ...row };
}

function toEmergencyContacts(
  rows: ReadonlyArray<{
    sortOrder: number;
    name: string;
    relationship: string | null;
    address: string | null;
    phone: string | null;
    mobile: string | null;
  }>,
): EmergencyContactDetail[] {
  return rows
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((row) => ({
      sortOrder: row.sortOrder,
      name: row.name,
      relationship: row.relationship,
      address: row.address,
      phone: row.phone,
      mobile: row.mobile,
    }));
}

function toDetail(row: {
  id: string;
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
  medicalHistory: string | null;
  notes: string | null;
  facility: { name: string };
  medicalCareInfo: {
    medicalFacilityName: string | null;
    primaryDoctor: string | null;
    emergencyHospital: string | null;
    emergencyHospital2: string | null;
    careOffice: string | null;
    careOfficePhone: string | null;
    careOfficeLicenseNo: string | null;
    careManagerName: string | null;
  } | null;
  emergencyContacts: ReadonlyArray<{
    sortOrder: number;
    name: string;
    relationship: string | null;
    address: string | null;
    phone: string | null;
    mobile: string | null;
  }>;
  careInsurance: { careLevel: CareLevel | null } | null;
}): ResidentDetail {
  return {
    id: row.id,
    facilityId: row.facilityId,
    facilityName: row.facility.name,
    name: row.name,
    nameKana: row.nameKana,
    birthDate: row.birthDate,
    age: calculateAge(row.birthDate),
    gender: row.gender,
    address: row.address,
    phone: row.phone,
    mobile: row.mobile,
    moveInDate: row.moveInDate,
    moveOutDate: row.moveOutDate,
    usageStatus: row.usageStatus,
    medicalHistory: row.medicalHistory,
    notes: row.notes,
    medicalCare: toMedicalCare(row.medicalCareInfo),
    emergencyContacts: toEmergencyContacts(row.emergencyContacts),
    careLevel: row.careInsurance?.careLevel ?? null,
  };
}

const detailInclude = {
  facility: { select: { name: true } },
  medicalCareInfo: true,
  emergencyContacts: true,
  careInsurance: { select: { careLevel: true } },
} as const;

function buildWhere(params: {
  facilityIds: ReadonlyArray<string>;
  keyword?: string;
  careLevel?: CareLevel;
  facilityId?: string;
  primaryDoctor?: string;
  careManagerKeyword?: string;
  usageStatus?: UsageStatus;
}): Prisma.ResidentWhereInput {
  const scopedFacilityIds = params.facilityId
    ? params.facilityIds.filter((id) => id === params.facilityId)
    : [...params.facilityIds];

  const where: Prisma.ResidentWhereInput = {
    facilityId: { in: scopedFacilityIds },
  };

  if (params.keyword?.trim()) {
    where.OR = [
      { name: { contains: params.keyword.trim(), mode: "insensitive" } },
      { nameKana: { contains: params.keyword.trim(), mode: "insensitive" } },
    ];
  }

  if (params.usageStatus) {
    where.usageStatus = params.usageStatus;
  }

  if (params.primaryDoctor?.trim()) {
    where.medicalCareInfo = {
      is: {
        primaryDoctor: {
          contains: params.primaryDoctor.trim(),
          mode: "insensitive",
        },
      },
    };
  }

  if (params.careManagerKeyword?.trim()) {
    where.medicalCareInfo = {
      ...(where.medicalCareInfo as Prisma.MedicalCareInfoNullableScalarRelationFilter),
      is: {
        careManagerName: {
          contains: params.careManagerKeyword.trim(),
          mode: "insensitive",
        },
      },
    };
  }

  if (params.careLevel) {
    where.careInsurance = {
      is: { careLevel: params.careLevel },
    };
  }

  return where;
}

function buildOrderBy(
  column: keyof ResidentListItem,
  direction: "asc" | "desc",
): Prisma.ResidentOrderByWithRelationInput {
  switch (column) {
    case "facilityName":
      return { facility: { name: direction } };
    case "primaryDoctor":
      return { medicalCareInfo: { primaryDoctor: direction } };
    case "careManagerName":
      return { medicalCareInfo: { careManagerName: direction } };
    case "careLevel":
      return { careInsurance: { careLevel: direction } };
    default:
      return { [column]: direction };
  }
}

export const residentRepository: ResidentRepository = {
  async search(params) {
    const where = buildWhere(params);

    const [rows, total] = await Promise.all([
      prisma.resident.findMany({
        where,
        include: {
          facility: { select: { name: true } },
          medicalCareInfo: {
            select: { primaryDoctor: true, careManagerName: true },
          },
          careInsurance: { select: { careLevel: true } },
        },
        orderBy: buildOrderBy(params.sort.column, params.sort.direction),
        skip: params.pagination.offset,
        take: params.pagination.limit,
      }),
      prisma.resident.count({ where }),
    ]);

    const items: ResidentListItem[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      birthDate: row.birthDate,
      age: calculateAge(row.birthDate),
      careLevel: row.careInsurance?.careLevel ?? null,
      facilityId: row.facilityId,
      facilityName: row.facility.name,
      primaryDoctor: row.medicalCareInfo?.primaryDoctor ?? null,
      careManagerName: row.medicalCareInfo?.careManagerName ?? null,
      usageStatus: row.usageStatus,
    }));

    return { items, total };
  },

  async findById(id, facilityIds) {
    const row = await prisma.resident.findFirst({
      where: { id, facilityId: { in: [...facilityIds] } },
      include: detailInclude,
    });
    return row ? toDetail(row) : null;
  },

  async findByIdUnscoped(id) {
    const row = await prisma.resident.findFirst({
      where: { id },
      include: detailInclude,
    });
    return row ? toDetail(row) : null;
  },

  async create(input) {
    const row = await prisma.resident.create({
      data: {
        facilityId: input.facilityId,
        name: input.name,
        nameKana: input.nameKana,
        birthDate: input.birthDate,
        gender: input.gender,
        address: input.address,
        phone: input.phone,
        mobile: input.mobile,
        moveInDate: input.moveInDate,
        moveOutDate: input.moveOutDate,
        usageStatus: input.usageStatus,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      },
      include: detailInclude,
    });
    return toDetail(row);
  },

  async update(id, input) {
    const row = await prisma.resident.update({
      where: { id },
      data: {
        facilityId: input.facilityId,
        name: input.name,
        nameKana: input.nameKana,
        birthDate: input.birthDate,
        gender: input.gender,
        address: input.address,
        phone: input.phone,
        mobile: input.mobile,
        moveInDate: input.moveInDate,
        moveOutDate: input.moveOutDate,
        usageStatus: input.usageStatus,
        updatedBy: input.updatedBy,
      },
      include: detailInclude,
    });
    return toDetail(row);
  },

  async delete(id) {
    await prisma.resident.delete({ where: { id } });
  },
};
