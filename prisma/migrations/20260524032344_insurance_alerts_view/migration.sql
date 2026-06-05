-- CreateIndex
CREATE INDEX "care_insurance_period_end_idx" ON "care_insurance"("period_end");

-- CreateIndex
CREATE INDEX "care_insurance_burden_ratio_expires_at_idx" ON "care_insurance"("burden_ratio_expires_at");

-- CreateIndex
CREATE INDEX "comprehensive_insurance_records_end_date_idx" ON "comprehensive_insurance_records"("end_date");

-- CreateIndex
CREATE INDEX "disability_welfare_info_period_end_idx" ON "disability_welfare_info"("period_end");

-- CreateIndex
CREATE INDEX "medical_insurance_expires_at_idx" ON "medical_insurance"("expires_at");

-- CreateIndex
CREATE INDEX "public_expense_records_expires_at_idx" ON "public_expense_records"("expires_at");

-- CreateIndex
CREATE INDEX "residents_facility_id_name_kana_idx" ON "residents"("facility_id", "name_kana");

-- CreateIndex
CREATE INDEX "residents_facility_id_usage_status_idx" ON "residents"("facility_id", "usage_status");

-- v_insurance_alerts: 6 種の保険期限を UNION ALL で集約し、bucket を日付基準で割り当てる（Req 9.1, 9.2, 9.5）。
-- Prisma は view をモデル化しないため、手動 SQL で定義する。
CREATE OR REPLACE VIEW "v_insurance_alerts" AS
SELECT
  alert_key,
  resident_id,
  facility_id,
  insurance_kind,
  end_date,
  remaining_days,
  CASE
    WHEN remaining_days < 0 THEN 'expired'
    WHEN remaining_days <= 30 THEN 'within_30'
    WHEN remaining_days <= 60 THEN 'within_60'
    WHEN remaining_days <= 90 THEN 'within_90'
    ELSE NULL
  END AS bucket
FROM (
  SELECT
    ('care:' || ci."resident_id"::text) AS alert_key,
    ci."resident_id",
    r."facility_id",
    'care'::text AS insurance_kind,
    ci."period_end" AS end_date,
    (ci."period_end" - CURRENT_DATE) AS remaining_days
  FROM "care_insurance" ci
  INNER JOIN "residents" r ON r."id" = ci."resident_id"
  WHERE ci."period_end" IS NOT NULL

  UNION ALL

  SELECT
    ('medical:' || mi."resident_id"::text) AS alert_key,
    mi."resident_id",
    r."facility_id",
    'medical'::text AS insurance_kind,
    mi."expires_at" AS end_date,
    (mi."expires_at" - CURRENT_DATE) AS remaining_days
  FROM "medical_insurance" mi
  INNER JOIN "residents" r ON r."id" = mi."resident_id"
  WHERE mi."expires_at" IS NOT NULL

  UNION ALL

  SELECT
    ('disability:' || dwi."resident_id"::text) AS alert_key,
    dwi."resident_id",
    r."facility_id",
    'disability'::text AS insurance_kind,
    dwi."period_end" AS end_date,
    (dwi."period_end" - CURRENT_DATE) AS remaining_days
  FROM "disability_welfare_info" dwi
  INNER JOIN "residents" r ON r."id" = dwi."resident_id"
  WHERE dwi."period_end" IS NOT NULL

  UNION ALL

  SELECT
    ('burden_ratio:' || ci."resident_id"::text) AS alert_key,
    ci."resident_id",
    r."facility_id",
    'burden_ratio'::text AS insurance_kind,
    ci."burden_ratio_expires_at" AS end_date,
    (ci."burden_ratio_expires_at" - CURRENT_DATE) AS remaining_days
  FROM "care_insurance" ci
  INNER JOIN "residents" r ON r."id" = ci."resident_id"
  WHERE ci."burden_ratio_expires_at" IS NOT NULL

  UNION ALL

  SELECT
    ('public_expense:' || per."id"::text) AS alert_key,
    per."resident_id",
    r."facility_id",
    'public_expense'::text AS insurance_kind,
    per."expires_at" AS end_date,
    (per."expires_at" - CURRENT_DATE) AS remaining_days
  FROM "public_expense_records" per
  INNER JOIN "residents" r ON r."id" = per."resident_id"
  WHERE per."expires_at" IS NOT NULL

  UNION ALL

  SELECT
    ('comprehensive:' || cir."id"::text) AS alert_key,
    cir."resident_id",
    r."facility_id",
    'comprehensive'::text AS insurance_kind,
    cir."end_date" AS end_date,
    (cir."end_date" - CURRENT_DATE) AS remaining_days
  FROM "comprehensive_insurance_records" cir
  INNER JOIN "residents" r ON r."id" = cir."resident_id"
  WHERE cir."end_date" IS NOT NULL
) AS alert_rows
WHERE remaining_days <= 90;
