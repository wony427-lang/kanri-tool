// デモ用利用者を 5 名、関連情報を含めて一括登録する。
// 実行: npx tsx scripts/seed-demo-residents.ts
// 前提: .env.local に DATABASE_URL 等が設定済み。職員「鈴木太郎」が存在すること。

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { Prisma, type VendorType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";

function d(iso: string): Date {
  return new Date(iso);
}

type DemoResident = {
  name: string;
  nameKana: string;
  birthDate: string;
  gender: string;
  address: string;
  phone: string;
  mobile: string;
  moveInDate: string;
  usageStatus: "active" | "scheduled" | "paused";
  medicalHistory: string;
  notes: string;
  medicalCare: {
    medicalFacilityName: string;
    primaryDoctor: string;
    emergencyHospital: string;
    emergencyHospital2: string;
    careOffice: string;
    careOfficePhone: string;
    careOfficeLicenseNo: string;
    careManagerName: string;
  };
  contacts: [
    {
      sortOrder: 1;
      name: string;
      relationship: string;
      address: string;
      phone: string;
      mobile: string;
    },
    {
      sortOrder: 2;
      name: string;
      relationship: string;
      address: string;
      phone: string;
      mobile: string;
    },
  ];
  careInsurance: {
    insurerNo: string;
    insuredNo: string;
    careLevel: "support1" | "care2" | "care3" | "care4" | "care5";
    certificationDate: string;
    periodStart: string;
    periodEnd: string;
    burdenRatio: number;
    burdenRatioExpiresAt: string;
  };
  medicalInsurance: {
    insurerNo: string;
    insuredNo: string;
    expiresAt: string;
  };
  disability: {
    recipientNo: string;
    supportLevel: string;
    serviceType: string;
    periodStart: string;
    periodEnd: string;
    serviceQuantity: string;
  };
  publicExpenses: Array<{
    kind: string;
    payerNo: string;
    recipientNo: string;
    selfBurden: number;
    expiresAt: string;
  }>;
  comprehensive: {
    insurerName: string;
    policyNo: string;
    joinedAt: string;
    startDate: string;
    endDate: string;
    annualPremium: number;
    notes: string;
  };
  vendors: Array<{
    vendorType: VendorType;
    vendorName: string;
    uniqueKey: string;
    notes: string;
  }>;
};

const DEMO_RESIDENTS: DemoResident[] = [
  {
    name: "山田 花子",
    nameKana: "ヤマダハナコ",
    birthDate: "1938-04-12",
    gender: "女性",
    address: "東京都千代田区丸の内1-1-1",
    phone: "03-1234-5678",
    mobile: "090-1111-2222",
    moveInDate: "2024-06-01",
    usageStatus: "active",
    medicalHistory: "高血圧、2型糖尿病。2020年に白内障手術歴あり。",
    notes: "朝食は軟食。週2回デイサービス利用。",
    medicalCare: {
      medicalFacilityName: "さくら内科クリニック",
      primaryDoctor: "田中医師",
      emergencyHospital: "東京中央総合病院",
      emergencyHospital2: "丸の内救急クリニック",
      careOffice: "ひまわり居宅介護支援事業所",
      careOfficePhone: "03-5555-0101",
      careOfficeLicenseNo: "1310123456",
      careManagerName: "佐藤 美咲",
    },
    contacts: [
      {
        sortOrder: 1,
        name: "山田 一郎",
        relationship: "長男",
        address: "東京都世田谷区上馬3-3-3",
        phone: "03-3333-4444",
        mobile: "080-1000-2000",
      },
      {
        sortOrder: 2,
        name: "山田 恵子",
        relationship: "長男の妻",
        address: "東京都世田谷区上馬3-3-3",
        phone: "",
        mobile: "080-2000-3000",
      },
    ],
    careInsurance: {
      insurerNo: "131016",
      insuredNo: "1234567890",
      careLevel: "care3",
      certificationDate: "2024-05-01",
      periodStart: "2024-05-01",
      periodEnd: "2027-04-30",
      burdenRatio: 2,
      burdenRatioExpiresAt: "2026-07-31",
    },
    medicalInsurance: {
      insurerNo: "06131111",
      insuredNo: "12345678",
      expiresAt: "2026-03-31",
    },
    disability: {
      recipientNo: "1234567890",
      supportLevel: "区分3",
      serviceType: "居宅介護",
      periodStart: "2024-04-01",
      periodEnd: "2026-03-31",
      serviceQuantity: "月20時間",
    },
    publicExpenses: [
      {
        kind: "生活保護（医療）",
        payerNo: "12123456",
        recipientNo: "1234567",
        selfBurden: 0,
        expiresAt: "2026-03-31",
      },
    ],
    comprehensive: {
      insurerName: "デモ損害保険株式会社",
      policyNo: "CI-2024-00001",
      joinedAt: "2024-06-01",
      startDate: "2024-06-01",
      endDate: "2025-05-31",
      annualPremium: 12000,
      notes: "年払い・自動更新想定",
    },
    vendors: [
      {
        vendorType: "care_billing",
        vendorName: "ケア請求センターA",
        uniqueKey: "CARE-A-10001",
        notes: "介護請求連携",
      },
      {
        vendorType: "medical",
        vendorName: "医療費集計B",
        uniqueKey: "MED-B-20001",
        notes: "",
      },
      {
        vendorType: "meal",
        vendorName: "給食サービスC",
        uniqueKey: "MEAL-C-30001",
        notes: "昼食のみ",
      },
    ],
  },
  {
    name: "佐藤 健一",
    nameKana: "サトウケンイチ",
    birthDate: "1945-11-03",
    gender: "男性",
    address: "神奈川県横浜市西区みなとみらい2-2-2",
    phone: "045-222-3333",
    mobile: "090-3333-4444",
    moveInDate: "2023-01-15",
    usageStatus: "active",
    medicalHistory: "慢性心不全、前立腺肥大。禁煙指導中。",
    notes: "車椅子利用。入浴は機械浴。",
    medicalCare: {
      medicalFacilityName: "みなと心臓内科",
      primaryDoctor: "鈴木医師",
      emergencyHospital: "横浜市立みなと赤十字病院",
      emergencyHospital2: "西区救急診療所",
      careOffice: "ケアプラン横浜西",
      careOfficePhone: "045-777-8888",
      careOfficeLicenseNo: "1410987654",
      careManagerName: "高橋 誠",
    },
    contacts: [
      {
        sortOrder: 1,
        name: "佐藤 由美",
        relationship: "配偶者",
        address: "神奈川県横浜市西区みなとみらい2-2-2",
        phone: "045-222-3333",
        mobile: "090-5555-6666",
      },
      {
        sortOrder: 2,
        name: "佐藤 翔太",
        relationship: "次男",
        address: "神奈川県川崎市中原区木月1-1-1",
        phone: "044-111-2222",
        mobile: "080-7777-8888",
      },
    ],
    careInsurance: {
      insurerNo: "141051",
      insuredNo: "2345678901",
      careLevel: "care4",
      certificationDate: "2023-12-01",
      periodStart: "2023-12-01",
      periodEnd: "2026-11-30",
      burdenRatio: 1,
      burdenRatioExpiresAt: "2025-12-31",
    },
    medicalInsurance: {
      insurerNo: "06132222",
      insuredNo: "23456789",
      expiresAt: "2025-11-30",
    },
    disability: {
      recipientNo: "2345678901",
      supportLevel: "区分4",
      serviceType: "重度訪問介護",
      periodStart: "2023-10-01",
      periodEnd: "2025-09-30",
      serviceQuantity: "月40時間",
    },
    publicExpenses: [
      {
        kind: "障害者総合支援（通所）",
        payerNo: "12124567",
        recipientNo: "2345678",
        selfBurden: 5000,
        expiresAt: "2025-09-30",
      },
      {
        kind: "感染症法14条",
        payerNo: "12125678",
        recipientNo: "3456789",
        selfBurden: 0,
        expiresAt: "2026-06-30",
      },
    ],
    comprehensive: {
      insurerName: "デモ損害保険株式会社",
      policyNo: "CI-2023-00042",
      joinedAt: "2023-01-15",
      startDate: "2023-01-15",
      endDate: "2024-01-14",
      annualPremium: 15000,
      notes: "初年度契約",
    },
    vendors: [
      {
        vendorType: "insurer",
        vendorName: "保険会社連携D",
        uniqueKey: "INS-D-40001",
        notes: "",
      },
      {
        vendorType: "home_nursing",
        vendorName: "訪問看護ステーションE",
        uniqueKey: "HN-E-50001",
        notes: "週3回",
      },
      {
        vendorType: "other",
        vendorName: "理美容サービスF",
        uniqueKey: "OTH-F-60001",
        notes: "月1回カット",
      },
    ],
  },
  {
    name: "田中 みどり",
    nameKana: "タナカミドリ",
    birthDate: "1952-07-22",
    gender: "女性",
    address: "埼玉県さいたま市大宮区桜木町4-4-4",
    phone: "048-444-5555",
    mobile: "",
    moveInDate: "2025-04-01",
    usageStatus: "scheduled",
    medicalHistory: "変形性膝関節症。認知症は軽度。",
    notes: "入居予定。家具搬入は4月下旬。",
    medicalCare: {
      medicalFacilityName: "大宮整形外科",
      primaryDoctor: "伊藤医師",
      emergencyHospital: "さいたま総合病院",
      emergencyHospital2: "大宮中央病院",
      careOffice: "桜木ケアマネ事業所",
      careOfficePhone: "048-666-7777",
      careOfficeLicenseNo: "1110456789",
      careManagerName: "中村 あゆみ",
    },
    contacts: [
      {
        sortOrder: 1,
        name: "田中 浩二",
        relationship: "甥",
        address: "埼玉県川口市本町5-5-5",
        phone: "048-888-9999",
        mobile: "070-1234-5678",
      },
      {
        sortOrder: 2,
        name: "田中 理沙",
        relationship: "甥の妻",
        address: "埼玉県川口市本町5-5-5",
        phone: "",
        mobile: "070-9876-5432",
      },
    ],
    careInsurance: {
      insurerNo: "111015",
      insuredNo: "3456789012",
      careLevel: "support1",
      certificationDate: "2025-03-01",
      periodStart: "2025-03-01",
      periodEnd: "2028-02-28",
      burdenRatio: 3,
      burdenRatioExpiresAt: "2027-02-28",
    },
    medicalInsurance: {
      insurerNo: "06133333",
      insuredNo: "34567890",
      expiresAt: "2027-02-28",
    },
    disability: {
      recipientNo: "3456789012",
      supportLevel: "区分2",
      serviceType: "移動支援",
      periodStart: "2025-01-01",
      periodEnd: "2026-12-31",
      serviceQuantity: "月10回",
    },
    publicExpenses: [
      {
        kind: "原爆医療",
        payerNo: "12126789",
        recipientNo: "4567890",
        selfBurden: 0,
        expiresAt: "2027-12-31",
      },
    ],
    comprehensive: {
      insurerName: "デモ生命保険相互会社",
      policyNo: "CI-2025-00103",
      joinedAt: "2025-04-01",
      startDate: "2025-04-01",
      endDate: "2026-03-31",
      annualPremium: 10000,
      notes: "入居予定に合わせて加入",
    },
    vendors: [
      {
        vendorType: "care_billing",
        vendorName: "埼玉介護請求G",
        uniqueKey: "CARE-G-70001",
        notes: "",
      },
      {
        vendorType: "medical",
        vendorName: "関東医療連携H",
        uniqueKey: "MED-H-80001",
        notes: "",
      },
    ],
  },
  {
    name: "高橋 正男",
    nameKana: "タカハシマサオ",
    birthDate: "1935-12-30",
    gender: "男性",
    address: "千葉県船橋市本町6-6-6",
    phone: "047-555-6666",
    mobile: "090-4444-5555",
    moveInDate: "2022-08-10",
    usageStatus: "active",
    medicalHistory: "パーキンソン病、誤嚥性肺炎の既往。",
    notes: "とろみ食。見守り歩行。",
    medicalCare: {
      medicalFacilityName: "船橋神経内科",
      primaryDoctor: "渡辺医師",
      emergencyHospital: "船橋総合医療センター",
      emergencyHospital2: "東京湾岸救急病院",
      careOffice: "本町居宅支援センター",
      careOfficePhone: "047-111-2222",
      careOfficeLicenseNo: "1210345678",
      careManagerName: "小林 直樹",
    },
    contacts: [
      {
        sortOrder: 1,
        name: "高橋 京子",
        relationship: "長女",
        address: "千葉県柏市柏1-1-1",
        phone: "04-3333-4444",
        mobile: "080-3333-4444",
      },
      {
        sortOrder: 2,
        name: "高橋 拓也",
        relationship: "孫",
        address: "東京都江戸川区西小岩2-2-2",
        phone: "",
        mobile: "090-6666-7777",
      },
    ],
    careInsurance: {
      insurerNo: "121011",
      insuredNo: "4567890123",
      careLevel: "care5",
      certificationDate: "2022-07-01",
      periodStart: "2022-07-01",
      periodEnd: "2025-06-30",
      burdenRatio: 1,
      burdenRatioExpiresAt: "2025-06-30",
    },
    medicalInsurance: {
      insurerNo: "06134444",
      insuredNo: "45678901",
      expiresAt: "2025-06-30",
    },
    disability: {
      recipientNo: "4567890123",
      supportLevel: "区分5",
      serviceType: "同行援護",
      periodStart: "2022-06-01",
      periodEnd: "2025-05-31",
      serviceQuantity: "月30時間",
    },
    publicExpenses: [
      {
        kind: "難病医療",
        payerNo: "12127890",
        recipientNo: "5678901",
        selfBurden: 10000,
        expiresAt: "2025-05-31",
      },
    ],
    comprehensive: {
      insurerName: "デモ損害保険株式会社",
      policyNo: "CI-2022-00088",
      joinedAt: "2022-08-10",
      startDate: "2022-08-10",
      endDate: "2023-08-09",
      annualPremium: 18000,
      notes: "長期加入者",
    },
    vendors: [
      {
        vendorType: "care_billing",
        vendorName: "千葉介護請求I",
        uniqueKey: "CARE-I-90001",
        notes: "",
      },
      {
        vendorType: "meal",
        vendorName: "とろみ食キッチンJ",
        uniqueKey: "MEAL-J-91001",
        notes: "個別対応",
      },
      {
        vendorType: "home_nursing",
        vendorName: "船橋訪問看護K",
        uniqueKey: "HN-K-92001",
        notes: "",
      },
      {
        vendorType: "insurer",
        vendorName: "国保連合会L",
        uniqueKey: "INS-L-93001",
        notes: "",
      },
    ],
  },
  {
    name: "伊藤 さくら",
    nameKana: "イトウサクラ",
    birthDate: "1948-02-14",
    gender: "女性",
    address: "東京都練馬区豊玉北7-7-7",
    phone: "03-9999-0000",
    mobile: "080-8888-9999",
    moveInDate: "2025-01-20",
    usageStatus: "paused",
    medicalHistory: "骨粗鬆症、一時的に実家療養のため入居一時停止。",
    notes: "2025年9月頃の復帰見込み。",
    medicalCare: {
      medicalFacilityName: "練馬ファミリークリニック",
      primaryDoctor: "松本医師",
      emergencyHospital: "練馬総合病院",
      emergencyHospital2: "豊島病院",
      careOffice: "豊玉ケアプラン",
      careOfficePhone: "03-2222-3333",
      careOfficeLicenseNo: "1310789012",
      careManagerName: "森 優子",
    },
    contacts: [
      {
        sortOrder: 1,
        name: "伊藤 大輔",
        relationship: "弟",
        address: "東京都杉並区高井戸西8-8-8",
        phone: "03-4444-5555",
        mobile: "090-1111-3333",
      },
      {
        sortOrder: 2,
        name: "伊藤 真由",
        relationship: "弟の妻",
        address: "東京都杉並区高井戸西8-8-8",
        phone: "03-4444-5555",
        mobile: "090-2222-4444",
      },
    ],
    careInsurance: {
      insurerNo: "131024",
      insuredNo: "5678901234",
      careLevel: "care2",
      certificationDate: "2024-11-01",
      periodStart: "2024-11-01",
      periodEnd: "2027-10-31",
      burdenRatio: 2,
      burdenRatioExpiresAt: "2026-10-31",
    },
    medicalInsurance: {
      insurerNo: "06135555",
      insuredNo: "56789012",
      expiresAt: "2026-10-31",
    },
    disability: {
      recipientNo: "5678901234",
      supportLevel: "区分1",
      serviceType: "生活介護",
      periodStart: "2024-09-01",
      periodEnd: "2026-08-31",
      serviceQuantity: "週5日",
    },
    publicExpenses: [
      {
        kind: "中国残留邦人",
        payerNo: "12128901",
        recipientNo: "6789012",
        selfBurden: 0,
        expiresAt: "2026-08-31",
      },
    ],
    comprehensive: {
      insurerName: "デモ生命保険相互会社",
      policyNo: "CI-2025-00205",
      joinedAt: "2025-01-20",
      startDate: "2025-01-20",
      endDate: "2026-01-19",
      annualPremium: 11000,
      notes: "一時停止中も契約継続",
    },
    vendors: [
      {
        vendorType: "other",
        vendorName: "実家療養サポートM",
        uniqueKey: "OTH-M-94001",
        notes: "一時停止期間の連絡先",
      },
      {
        vendorType: "care_billing",
        vendorName: "練馬介護請求N",
        uniqueKey: "CARE-N-95001",
        notes: "",
      },
    ],
  },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const actor = await prisma.staffAccount.findFirst({
      where: { displayName: "鈴木太郎" },
      include: {
        facilityAssignments: {
          include: { facility: { select: { id: true, name: true, isActive: true } } },
        },
      },
    });

    if (!actor) {
      console.error('職員「鈴木太郎」が見つかりません');
      process.exit(1);
    }

    const facility =
      actor.facilityAssignments.find((a) => a.facility.isActive)?.facility ??
      (await prisma.facility.findFirst({ where: { isActive: true } }));

    if (!facility) {
      console.error("有効な施設がありません");
      process.exit(1);
    }

    console.log(
      `登録者: ${actor.displayName} (${actor.id})\n施設: ${facility.name} (${facility.id})\n`,
    );

    const createdIds: string[] = [];

    for (const demo of DEMO_RESIDENTS) {
      const residentId = await prisma.$transaction(async (tx) => {
        const resident = await tx.resident.create({
          data: {
            facilityId: facility.id,
            name: demo.name,
            nameKana: demo.nameKana,
            birthDate: d(demo.birthDate),
            gender: demo.gender,
            address: demo.address,
            phone: demo.phone,
            mobile: demo.mobile || null,
            moveInDate: d(demo.moveInDate),
            moveOutDate: null,
            usageStatus: demo.usageStatus,
            medicalHistory: demo.medicalHistory,
            notes: demo.notes,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
        });

        await tx.medicalCareInfo.create({
          data: {
            residentId: resident.id,
            ...demo.medicalCare,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
        });

        await tx.emergencyContact.createMany({
          data: demo.contacts.map((c) => ({
            residentId: resident.id,
            sortOrder: c.sortOrder,
            name: c.name,
            relationship: c.relationship,
            address: c.address,
            phone: c.phone || null,
            mobile: c.mobile || null,
            createdBy: actor.id,
            updatedBy: actor.id,
          })),
        });

        await tx.careInsurance.create({
          data: {
            residentId: resident.id,
            insurerNo: demo.careInsurance.insurerNo,
            insuredNo: demo.careInsurance.insuredNo,
            careLevel: demo.careInsurance.careLevel,
            certificationDate: d(demo.careInsurance.certificationDate),
            periodStart: d(demo.careInsurance.periodStart),
            periodEnd: d(demo.careInsurance.periodEnd),
            burdenRatio: demo.careInsurance.burdenRatio,
            burdenRatioExpiresAt: d(demo.careInsurance.burdenRatioExpiresAt),
            createdBy: actor.id,
            updatedBy: actor.id,
          },
        });

        await tx.medicalInsurance.create({
          data: {
            residentId: resident.id,
            insurerNo: demo.medicalInsurance.insurerNo,
            insuredNo: demo.medicalInsurance.insuredNo,
            expiresAt: d(demo.medicalInsurance.expiresAt),
            createdBy: actor.id,
            updatedBy: actor.id,
          },
        });

        await tx.disabilityWelfareInfo.create({
          data: {
            residentId: resident.id,
            recipientNo: demo.disability.recipientNo,
            supportLevel: demo.disability.supportLevel,
            serviceType: demo.disability.serviceType,
            periodStart: d(demo.disability.periodStart),
            periodEnd: d(demo.disability.periodEnd),
            serviceQuantity: demo.disability.serviceQuantity,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
        });

        await tx.publicExpenseRecord.createMany({
          data: demo.publicExpenses.map((pe) => ({
            residentId: resident.id,
            kind: pe.kind,
            payerNo: pe.payerNo,
            recipientNo: pe.recipientNo,
            selfBurden: new Prisma.Decimal(pe.selfBurden),
            expiresAt: d(pe.expiresAt),
            createdBy: actor.id,
            updatedBy: actor.id,
          })),
        });

        const startDate = d(demo.comprehensive.startDate);
        const endDate = d(demo.comprehensive.endDate);
        await tx.comprehensiveInsuranceRecord.create({
          data: {
            residentId: resident.id,
            enrolled: true,
            insurerName: demo.comprehensive.insurerName,
            policyNo: demo.comprehensive.policyNo,
            joinedAt: d(demo.comprehensive.joinedAt),
            startDate,
            endDate,
            annualPremium: new Prisma.Decimal(demo.comprehensive.annualPremium),
            nextBillingDate: startDate,
            billingStatus: "unbilled",
            paymentStatus: "unpaid",
            notes: demo.comprehensive.notes,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
        });

        await tx.externalVendorKey.createMany({
          data: demo.vendors.map((v) => ({
            residentId: resident.id,
            vendorType: v.vendorType,
            vendorName: v.vendorName,
            uniqueKey: v.uniqueKey,
            notes: v.notes || null,
            createdBy: actor.id,
            updatedBy: actor.id,
          })),
        });

        await tx.auditLog.create({
          data: {
            kind: "resident_created",
            actorStaffAccountId: actor.id,
            targetType: "resident",
            targetId: resident.id,
            metadata: { facilityId: facility.id, source: "seed-demo-residents" },
          },
        });

        return resident.id;
      });

      createdIds.push(residentId);
      console.log(`✓ ${demo.name} → /residents/${residentId}`);
    }

    console.log(`\n完了: ${createdIds.length} 名を登録しました`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[seed-demo-residents] FAILED:", error);
  process.exit(1);
});
