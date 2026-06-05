-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('unbilled', 'billed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('care_billing', 'medical', 'insurer', 'meal', 'home_nursing', 'other');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('family_chart', 'floor_plan');

-- CreateEnum
CREATE TYPE "AlertHandleStatus" AS ENUM ('not_handled', 'confirmed', 'contacted', 'renewed');

-- CreateTable
CREATE TABLE "comprehensive_insurance_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resident_id" UUID NOT NULL,
    "enrolled" BOOLEAN NOT NULL DEFAULT false,
    "insurer_name" TEXT,
    "policy_no" TEXT,
    "joined_at" DATE,
    "start_date" DATE,
    "end_date" DATE,
    "annual_premium" DECIMAL(12,0),
    "next_billing_date" DATE,
    "billing_status" "BillingStatus" NOT NULL DEFAULT 'unbilled',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "comprehensive_insurance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_vendor_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resident_id" UUID NOT NULL,
    "vendor_type" "VendorType" NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "unique_key" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "external_vendor_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resident_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resident_id" UUID NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" UUID NOT NULL,

    CONSTRAINT "resident_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_status_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "alert_key" TEXT NOT NULL,
    "status" "AlertHandleStatus" NOT NULL DEFAULT 'not_handled',
    "notes" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "alert_status_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comprehensive_insurance_records_resident_id_next_billing_da_idx" ON "comprehensive_insurance_records"("resident_id", "next_billing_date");

-- CreateIndex
CREATE UNIQUE INDEX "external_vendor_keys_resident_id_vendor_type_vendor_name_key" ON "external_vendor_keys"("resident_id", "vendor_type", "vendor_name");

-- CreateIndex
CREATE UNIQUE INDEX "resident_attachments_resident_id_kind_key" ON "resident_attachments"("resident_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "alert_status_updates_alert_key_key" ON "alert_status_updates"("alert_key");

-- AddForeignKey
ALTER TABLE "comprehensive_insurance_records" ADD CONSTRAINT "comprehensive_insurance_records_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_vendor_keys" ADD CONSTRAINT "external_vendor_keys_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_attachments" ADD CONSTRAINT "resident_attachments_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- CHECK 制約: 期間整合・金額非負・添付バイト数 > 0
-- =============================================================================

-- 利用者総合保険: 保険期間 end >= start を両端非 NULL 時に強制（Req 7.8 と同方針）。
ALTER TABLE "comprehensive_insurance_records" ADD CONSTRAINT "comprehensive_insurance_records_period_check"
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);

-- 利用者総合保険: 年間保険料は非負（負の保険料は業務上ありえない）。
ALTER TABLE "comprehensive_insurance_records" ADD CONSTRAINT "comprehensive_insurance_records_annual_premium_check"
  CHECK (annual_premium IS NULL OR annual_premium >= 0);

-- 添付ファイル: byte_size > 0（ゼロバイト誤投入の防止 / Req 11.3 と整合）。
ALTER TABLE "resident_attachments" ADD CONSTRAINT "resident_attachments_byte_size_check"
  CHECK (byte_size > 0);
