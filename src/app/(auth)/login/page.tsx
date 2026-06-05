import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <section className="rounded-lg border border-muted-foreground/20 bg-background p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-foreground">ログイン</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        従業員 ID とパスワードを入力してください。
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </section>
  );
}
