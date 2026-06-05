export {
  createResidentAction,
  deleteResidentAction,
  getResidentAction,
  listAccessibleFacilitiesAction,
  searchResidentsAction,
  updateResidentAction,
} from "./actions";
export {
  canDeleteResidents,
  canManageResidents,
  createResident,
  deleteResident,
  getResidentById,
  searchResidents,
  updateResident,
} from "./service";
export type {
  CreateResidentInput,
  ResidentDetail,
  ResidentListItem,
  ResidentSearchQuery,
  UpdateResidentInput,
} from "./types";
