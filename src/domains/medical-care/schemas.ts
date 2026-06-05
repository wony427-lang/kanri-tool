import { z } from "zod";

export interface MedicalCareInfoInput {
  medicalFacilityName?: string;
  primaryDoctor?: string;
  emergencyHospital?: string;
  emergencyHospital2?: string;
  careOffice?: string;
  careOfficePhone?: string;
  careOfficeLicenseNo?: string;
  careManagerName?: string;
}

export interface EmergencyContactSlotInput {
  name?: string;
  relationship?: string;
  address?: string;
  phone?: string;
  mobile?: string;
}

export interface EmergencyContactsInput {
  contact1?: EmergencyContactSlotInput;
  contact2?: EmergencyContactSlotInput;
}

export interface MedicalHistoryInput {
  medicalHistory?: string;
  notes?: string;
}

const optionalString = z.string().optional();

export const medicalCareInfoSchema = z.object({
  medicalFacilityName: optionalString,
  primaryDoctor: optionalString,
  emergencyHospital: optionalString,
  emergencyHospital2: optionalString,
  careOffice: optionalString,
  careOfficePhone: optionalString,
  careOfficeLicenseNo: optionalString,
  careManagerName: optionalString,
});

const contactSlotSchema = z.object({
  name: optionalString,
  relationship: optionalString,
  address: optionalString,
  phone: optionalString,
  mobile: optionalString,
});

export const emergencyContactsSchema = z.object({
  contact1: contactSlotSchema.optional(),
  contact2: contactSlotSchema.optional(),
});

export const medicalHistorySchema = z.object({
  medicalHistory: optionalString,
  notes: optionalString,
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path.join(".")), issue.message]),
  );
}
