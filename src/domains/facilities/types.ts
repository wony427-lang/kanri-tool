export interface FacilitySummary {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFacilityInput {
  name: string;
}

export interface UpdateFacilityInput {
  name: string;
  isActive: boolean;
}

export interface FacilityRepository {
  list(): Promise<FacilitySummary[]>;
  findById(id: string): Promise<FacilitySummary | null>;
  create(input: CreateFacilityInput & { createdBy: string }): Promise<FacilitySummary>;
  update(
    id: string,
    input: UpdateFacilityInput & { updatedBy: string },
  ): Promise<FacilitySummary>;
}
