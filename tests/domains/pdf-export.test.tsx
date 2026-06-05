import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";

import { registerPdfFonts } from "@/domains/pdf-export/fonts";
import { ResidentProfileDocument } from "@/domains/pdf-export/ResidentProfileDocument";
import type { ResidentPdfData } from "@/domains/pdf-export/types";

const sampleData: ResidentPdfData = {
  resident: {
    id: "00000000-0000-4000-8000-000000000001",
    facilityId: "00000000-0000-4000-8000-000000000002",
    facilityName: "テスト施設",
    name: "山田太郎",
    nameKana: "ヤマダタロウ",
    birthDate: new Date("1940-01-15"),
    age: 86,
    gender: "男性",
    address: "東京都千代田区",
    phone: "03-1234-5678",
    mobile: "090-1234-5678",
    moveInDate: new Date("2024-04-01"),
    moveOutDate: null,
    usageStatus: "active",
    medicalHistory: "高血圧",
    notes: "特記事項なし",
    careLevel: "care3",
    medicalCare: {
      medicalFacilityName: "テスト病院",
      primaryDoctor: "佐藤医師",
      emergencyHospital: "救急病院",
      emergencyHospital2: "第二病院",
      careOffice: "ケアオフィス",
      careOfficePhone: "03-1111-2222",
      careOfficeLicenseNo: "1234567890",
      careManagerName: "田中ケアマネ",
    },
    emergencyContacts: [
      {
        sortOrder: 1,
        name: "山田花子",
        relationship: "長女",
        address: null,
        phone: "03-9999-8888",
        mobile: null,
      },
    ],
  },
  careInsurance: {
    residentId: "00000000-0000-4000-8000-000000000001",
    insurerNo: "123456",
    insuredNo: "1234567890",
    careLevel: "care3",
    certificationDate: new Date("2024-04-01"),
    periodStart: new Date("2024-04-01"),
    periodEnd: new Date("2025-03-31"),
    burdenRatio: 1,
    burdenRatioExpiresAt: new Date("2025-03-31"),
  },
  medicalInsurance: {
    residentId: "00000000-0000-4000-8000-000000000001",
    insurerNo: "654321",
    insuredNo: "0987654321",
    expiresAt: new Date("2026-03-31"),
  },
  disability: null,
  publicExpenses: [],
  exportedAt: new Date("2026-05-24T12:00:00+09:00"),
  exportedBy: "テスト職員",
};

describe("PDF export (tasks 13.1–13.2)", () => {
  it("registers Noto Sans JP fonts from public/fonts", () => {
    expect(() => registerPdfFonts()).not.toThrow();
    expect(() => registerPdfFonts()).not.toThrow();
  });

  it("renders a resident profile PDF buffer with Japanese text", async () => {
    registerPdfFonts();
    const buffer = await renderToBuffer(
      <ResidentProfileDocument data={sampleData} />,
    );
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  }, 30_000);
});
