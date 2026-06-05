-- CreateEnum
CREATE TYPE "CareLevel" AS ENUM ('support1', 'support2', 'care1', 'care2', 'care3', 'care4', 'care5', 'not_certified');

-- CreateTable
CREATE TABLE "care_insurance" (
    "resident_id" UUID NOT NULL,
    "insurer_no" TEXT,
    "insured_no" TEXT,
    "care_level" "CareLevel",
    "certification_date" DATE,
    "period_start" DATE,
    "period_end" DATE,
    "burden_ratio" SMALLINT,
    "burden_ratio_expires_at" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "care_insurance_pkey" PRIMARY KEY ("resident_id")
);

-- CreateTable
CREATE TABLE "medical_insurance" (
    "resident_id" UUID NOT NULL,
    "insurer_no" TEXT,
    "insured_no" TEXT,
    "expires_at" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "medical_insurance_pkey" PRIMARY KEY ("resident_id")
);

-- CreateTable
CREATE TABLE "disability_welfare_info" (
    "resident_id" UUID NOT NULL,
    "recipient_no" TEXT,
    "support_level" TEXT,
    "service_type" TEXT,
    "period_start" DATE,
    "period_end" DATE,
    "service_quantity" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "disability_welfare_info_pkey" PRIMARY KEY ("resident_id")
);

-- CreateTable
CREATE TABLE "public_expense_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resident_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "payer_no" TEXT,
    "recipient_no" TEXT,
    "self_burden" DECIMAL(12,0),
    "expires_at" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "public_expense_records_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "care_insurance" ADD CONSTRAINT "care_insurance_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_insurance" ADD CONSTRAINT "medical_insurance_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disability_welfare_info" ADD CONSTRAINT "disability_welfare_info_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_expense_records" ADD CONSTRAINT "public_expense_records_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- 期間整合 CHECK（Req 7.8）: period_end >= period_start を両端非 NULL 時に強制。
-- =============================================================================

ALTER TABLE "care_insurance" ADD CONSTRAINT "care_insurance_period_check"
  CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start);

ALTER TABLE "disability_welfare_info" ADD CONSTRAINT "disability_welfare_info_period_check"
  CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start);

-- =============================================================================
-- 桁数・形式 CHECK（Req 7.7）: 非 NULL のときのみ数字列・指定桁数を強制。
-- 介護保険: insurer_no = 市町村コード 6 桁、insured_no = 被保険者番号 10 桁。
-- 医療保険: insurer_no は保険種別差異を許容し 6〜8 桁数字とする
--           （健保 8 桁／国保 6 桁などのバリエーション）。
-- 障害福祉: 受給者証番号 10 桁。
-- 公費: 負担者番号 8 桁、受給者番号 7 桁（日本の標準フォーマット）。
-- =============================================================================

ALTER TABLE "care_insurance" ADD CONSTRAINT "care_insurance_insurer_no_format_check"
  CHECK (insurer_no IS NULL OR insurer_no ~ '^[0-9]{6}$');
ALTER TABLE "care_insurance" ADD CONSTRAINT "care_insurance_insured_no_format_check"
  CHECK (insured_no IS NULL OR insured_no ~ '^[0-9]{10}$');

ALTER TABLE "medical_insurance" ADD CONSTRAINT "medical_insurance_insurer_no_format_check"
  CHECK (insurer_no IS NULL OR insurer_no ~ '^[0-9]{6,8}$');

ALTER TABLE "disability_welfare_info" ADD CONSTRAINT "disability_welfare_info_recipient_no_format_check"
  CHECK (recipient_no IS NULL OR recipient_no ~ '^[0-9]{10}$');

ALTER TABLE "public_expense_records" ADD CONSTRAINT "public_expense_records_payer_no_format_check"
  CHECK (payer_no IS NULL OR payer_no ~ '^[0-9]{8}$');
ALTER TABLE "public_expense_records" ADD CONSTRAINT "public_expense_records_recipient_no_format_check"
  CHECK (recipient_no IS NULL OR recipient_no ~ '^[0-9]{7}$');

-- =============================================================================
-- 負担割合 CHECK: 1割／2割／3割の三択（介護保険負担割合証）。
-- =============================================================================

ALTER TABLE "care_insurance" ADD CONSTRAINT "care_insurance_burden_ratio_check"
  CHECK (burden_ratio IS NULL OR burden_ratio IN (1, 2, 3));
