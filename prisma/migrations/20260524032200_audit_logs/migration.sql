-- CreateEnum
CREATE TYPE "AuditEventKind" AS ENUM ('login_success', 'login_failure', 'login_locked', 'logout', 'permission_denied', 'resident_created', 'resident_updated', 'resident_deleted', 'pdf_exported', 'staff_account_created', 'staff_account_updated', 'staff_account_disabled', 'password_reset_requested', 'password_reset_completed', 'facility_created', 'facility_updated');

-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('resident', 'staff_account', 'facility', 'auth');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "AuditEventKind" NOT NULL,
    "actor_staff_account_id" UUID,
    "target_type" "AuditTargetType" NOT NULL,
    "target_id" UUID,
    "ip" INET,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_staff_account_id_created_at_idx" ON "audit_logs"("actor_staff_account_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_staff_account_id_fkey" FOREIGN KEY ("actor_staff_account_id") REFERENCES "staff_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
