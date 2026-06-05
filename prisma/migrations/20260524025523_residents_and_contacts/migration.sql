-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('active', 'discharged', 'scheduled', 'paused');

-- CreateTable
CREATE TABLE "residents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "facility_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_kana" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,
    "gender" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "move_in_date" DATE,
    "move_out_date" DATE,
    "usage_status" "UsageStatus" NOT NULL,
    "medical_history" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_care_info" (
    "resident_id" UUID NOT NULL,
    "medical_facility_name" TEXT,
    "primary_doctor" TEXT,
    "emergency_hospital" TEXT,
    "care_office" TEXT,
    "care_office_license_no" TEXT,
    "care_manager_name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "medical_care_info_pkey" PRIMARY KEY ("resident_id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resident_id" UUID NOT NULL,
    "sort_order" SMALLINT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emergency_contacts_resident_id_sort_order_key" ON "emergency_contacts"("resident_id", "sort_order");

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_care_info" ADD CONSTRAINT "medical_care_info_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 退去日整合 CHECK（Req 5.4 / 5.5）:
--   usage_status = 'discharged' ⇔ move_out_date IS NOT NULL
-- discharged のとき退去日必須、それ以外（active / scheduled / paused）のときは退去日 NULL。
ALTER TABLE "residents" ADD CONSTRAINT "residents_move_out_date_consistency_check"
  CHECK (
    (usage_status = 'discharged' AND move_out_date IS NOT NULL)
    OR
    (usage_status <> 'discharged' AND move_out_date IS NULL)
  );

-- 緊急連絡先のスロット制限（Req 10.3）: 1 利用者あたり最大 2 件のため sort_order ∈ {1, 2}。
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_sort_order_check"
  CHECK (sort_order IN (1, 2));
