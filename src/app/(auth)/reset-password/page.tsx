import { ResetPasswordForm } from "./ResetPasswordForm";
import { verifyRecoveryOnLoad } from "./verify-recovery";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token_hash?: string; code?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const tokenHash = params.token_hash ?? params.code;

  if (tokenHash) {
    await verifyRecoveryOnLoad(tokenHash);
  }

  return (
    <section className="rounded-lg border border-muted-foreground/20 bg-background p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-foreground">パスワード再設定</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        新しいパスワードを入力してください。
      </p>
      <div className="mt-6">
        <ResetPasswordForm />
      </div>
    </section>
  );
}
