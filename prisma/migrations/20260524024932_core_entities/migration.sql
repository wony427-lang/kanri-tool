-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'staff', 'viewer');

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "login_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_account_facilities" (
    "staff_account_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_account_facilities_pkey" PRIMARY KEY ("staff_account_id","facility_id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "login_id" TEXT NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "ip" INET,
    "attempted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_accounts_auth_user_id_key" ON "staff_accounts"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_accounts_login_id_key" ON "staff_accounts"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_accounts_email_key" ON "staff_accounts"("email");

-- CreateIndex
CREATE INDEX "staff_account_facilities_facility_id_idx" ON "staff_account_facilities"("facility_id");

-- CreateIndex
CREATE INDEX "login_attempts_login_id_attempted_at_idx" ON "login_attempts"("login_id", "attempted_at" DESC);

-- AddForeignKey
ALTER TABLE "staff_account_facilities" ADD CONSTRAINT "staff_account_facilities_staff_account_id_fkey" FOREIGN KEY ("staff_account_id") REFERENCES "staff_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_account_facilities" ADD CONSTRAINT "staff_account_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
