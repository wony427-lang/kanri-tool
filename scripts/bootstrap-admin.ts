// 初回管理者アカウントを作成するブートストラップスクリプト。
// 既存の管理者がいる場合は安全のため中止する。
//
// 使用例:
//   npx tsx scripts/bootstrap-admin.ts \
//     --login-id admin \
//     --email admin@example.com \
//     --password 'AdminPass123!' \
//     --display-name 管理者 \
//     --facility-name 本社

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import {
  PASSWORD_POLICY_MESSAGE,
  validatePasswordStrength,
} from "../src/domains/auth/password-policy.ts";

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith("--")) {
      result[key] = value;
      i += 1;
    }
  }
  return result;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[bootstrap-admin] ${name} is not set`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const loginId = args["login-id"] ?? "admin";
  const email = args.email ?? "admin@example.com";
  const password = args.password ?? "Admin1234";
  const displayName = args["display-name"] ?? "管理者";
  const facilityName = args["facility-name"] ?? "本社";

  if (!/^[a-zA-Z0-9._-]+$/.test(loginId)) {
    console.error(
      "[bootstrap-admin] login-id は英数字・._- のみ使用できます",
    );
    process.exit(1);
  }

  if (!validatePasswordStrength(password)) {
    console.error(
      `[bootstrap-admin] ${PASSWORD_POLICY_MESSAGE}`,
    );
    process.exit(1);
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const databaseUrl = requireEnv("DATABASE_URL");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    const existingAdmin = await prisma.staffAccount.findFirst({
      where: { role: "admin", isActive: true },
      select: { id: true, loginId: true },
    });

    if (existingAdmin) {
      console.error(
        `[bootstrap-admin] 有効な管理者が既に存在します (loginId=${existingAdmin.loginId})`,
      );
      console.error(
        "[bootstrap-admin] 追加の職員は /staff-accounts から作成してください",
      );
      process.exit(1);
    }

    const [existingLoginId, existingEmail] = await Promise.all([
      prisma.staffAccount.findUnique({ where: { loginId }, select: { id: true } }),
      prisma.staffAccount.findUnique({ where: { email }, select: { id: true } }),
    ]);

    if (existingLoginId) {
      console.error(`[bootstrap-admin] login-id "${loginId}" は既に使用されています`);
      process.exit(1);
    }
    if (existingEmail) {
      console.error(`[bootstrap-admin] email "${email}" は既に使用されています`);
      process.exit(1);
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { login_id: loginId },
    });

    if (authError || !authData.user) {
      console.error(
        "[bootstrap-admin] Supabase Auth ユーザーの作成に失敗しました:",
        authError?.message ?? "unknown error",
      );
      process.exit(1);
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const facility = await tx.facility.create({
          data: { name: facilityName },
        });

        const account = await tx.staffAccount.create({
          data: {
            authUserId: authData.user!.id,
            displayName,
            loginId,
            email,
            role: "admin",
            facilityAssignments: {
              create: [{ facilityId: facility.id }],
            },
          },
        });

        await tx.staffAccount.update({
          where: { id: account.id },
          data: {
            createdBy: account.id,
            updatedBy: account.id,
          },
        });

        await tx.auditLog.create({
          data: {
            kind: "staff_account_created",
            actorStaffAccountId: account.id,
            targetType: "staff_account",
            targetId: account.id,
            metadata: { role: "admin", bootstrap: true },
          },
        });

        return { account, facility };
      });

      console.log("[bootstrap-admin] 初回管理者を作成しました");
      console.log(`  loginId     : ${result.account.loginId}`);
      console.log(`  email       : ${result.account.email}`);
      console.log(`  displayName : ${result.account.displayName}`);
      console.log(`  facility    : ${result.facility.name} (${result.facility.id})`);
      console.log("");
      console.log("ログイン: http://127.0.0.1:3000/login");
      console.log(`  ログイン ID : ${loginId}`);
      console.log(`  パスワード  : （指定した値）`);
    } catch (error) {
      await admin.auth.admin.deleteUser(authData.user.id);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[bootstrap-admin] FAILED:", error);
  process.exit(1);
});
