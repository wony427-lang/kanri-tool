import "server-only";

import { prisma } from "@/shared/db/prisma";

import type {
  CreateFacilityInput,
  FacilityRepository,
  FacilitySummary,
  UpdateFacilityInput,
} from "./types";

function toSummary(row: {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): FacilitySummary {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const facilityRepository: FacilityRepository = {
  async list() {
    const rows = await prisma.facility.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return rows.map(toSummary);
  },

  async findById(id) {
    const row = await prisma.facility.findUnique({ where: { id } });
    return row ? toSummary(row) : null;
  },

  async create(input: CreateFacilityInput & { createdBy: string }) {
    const row = await prisma.facility.create({
      data: {
        name: input.name,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      },
    });
    return toSummary(row);
  },

  async update(
    id: string,
    input: UpdateFacilityInput & { updatedBy: string },
  ) {
    const row = await prisma.facility.update({
      where: { id },
      data: {
        name: input.name,
        isActive: input.isActive,
        updatedBy: input.updatedBy,
      },
    });
    return toSummary(row);
  },
};
