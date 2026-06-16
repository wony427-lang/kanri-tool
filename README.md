# kanri-tool

介護施設の利用者情報を一元管理する社内向け Web アプリ。詳細は `.kiro/steering/` と `.kiro/specs/resident-management/` を参照してください。

> **本システムはデモ用です。** 掲載しているアカウント・利用者情報はすべて架空のものであり、実在の人物・施設とは一切関係ありません。

## 主な機能

- **認証・セッション管理**: 従業員 ID + パスワードによるログイン（Supabase Auth）。アイドルタイムアウト、ログイン試行回数によるロックアウト、パスワードリセット。
- **権限管理（RBAC）**: `admin`（管理者）／ `staff`（一般職員）／ `viewer`（閲覧専用）の 3 ロール。認可はサーバ側で再判定し、施設スコープを全クエリに強制。
- **職員アカウント管理**: 管理者による職員の作成・編集・利用停止・パスワードリセット。
- **利用者基本情報管理**: 利用者の登録・参照・更新・削除と一覧表示。
- **利用者検索・一覧**: 氏名・カナ・利用状況などによる絞り込み検索。
- **保険情報管理**: 介護保険・医療保険・障害福祉・公費の各情報を管理。
- **利用者総合保険（年払い）管理**: 加入状況・請求／入金ステータス・次回請求日の管理。
- **保険期限アラート**: 各種有効期限の超過・接近を検知し、対応状況を更新。
- **医療機関・ケアマネ・緊急連絡先管理**: 主治医・居宅介護支援事業所・緊急連絡先などの管理。
- **補足情報・添付資料管理**: 補足情報の記録と添付ファイルのアップロード／差し替え。
- **外部業者連携キー管理**: 介護請求・医療・給食などの外部業者連携キーの登録・閲覧。
- **利用者基本情報 PDF 出力**: 利用者基本情報をフォーマット済み PDF として出力。
- **ダッシュボード**: 施設横断の概況とアラートの確認。
- **複数施設対応・データスコープ**: 所属施設に基づくデータ分離。管理者は施設フィルタ切替が可能。
- **個人情報保護・監査ログ**: 認証イベント・利用者の CUD・PDF 出力・職員アカウント変更などを `audit_logs` に記録。

ロール別の操作可否は `.kiro/steering/authentication.md` の「Role Matrix」を参照してください。

## テスト用アカウント

ローカル / デモ環境での動作確認用アカウントです。ログイン画面（`/login`）では **従業員 ID** とパスワードでログインします（メールアドレスではありません）。

| 従業員 ID | パスワード | ロール |
| --- | --- | --- |
| `admin` | `AdminPass123!` | 管理者（admin） |
| `yamada` | `Ab12345678` | 一般職員（staff） |
| `suzuki` | `Ab12345678` | 一般職員（staff） |

> 上記はデモ環境用の架空アカウントです。実運用する場合は `scripts/bootstrap-admin.ts` で初回管理者を作成し、以降は `/staff-accounts` から個別にアカウントを発行してください。

## セットアップ（開発者向け）

前提: Node.js（Next.js 16 が要求するバージョン）と npm。

```bash
# 1. 依存インストール
npm install

# 2. 環境変数の準備
#    `.env.example` を `.env.local` にコピーして値を埋める。
#    必須項目（DATABASE_URL / DIRECT_URL / NEXT_PUBLIC_SUPABASE_URL /
#    NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY）が
#    欠落していると `npm run build` / `npm run dev` が起動時に
#    src/shared/config/env.server.ts の zod 検証で停止する（fail-fast）。
cp .env.example .env.local

# 3. Prisma client の生成（npm install の postinstall でも自動実行される）
npx prisma generate

# 4. DB マイグレーション（初回 / スキーマ変更時）
#    DIRECT_URL を Supabase の 5432（PgBouncer を経由しない直接接続）に向けてから実行。
npx prisma migrate dev --name init

# 5. 開発サーバ起動
npm run dev
```

起動後、[http://localhost:3000](http://localhost:3000) を開きます（既に 3000 番が使用中の場合は Next.js が自動で空きポートにフォールバックします）。

主要スクリプト:

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバ起動（Turbopack） |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番ビルドの起動 |
| `npm run lint` | ESLint 実行 |
| `npm test` | Vitest を 1 回実行（CI 用） |
| `npm run test:watch` | Vitest を watch モードで起動 |

## 主要技術スタック（タスク 1.1 / 1.3 時点で導入済み）

- Next.js 16 (App Router) / React 19 / TypeScript 5 / Tailwind CSS v4
- Supabase: `@supabase/ssr`, `@supabase/supabase-js`
- ORM: `prisma`（v7） + `@prisma/client` + `@prisma/adapter-pg` + `pg`
  - Prisma v7 では schema から `url` / `directUrl` が廃止されたため、CLI 用接続文字列は `prisma.config.ts` 経由で `DIRECT_URL` を渡し、ランタイムでは `src/shared/db/prisma.ts` の `PrismaPg` adapter が `DATABASE_URL`（PgBouncer 6543）を使う。
  - Prisma Client の出力先は `src/generated/prisma`（gitignore 済み）。アプリ側からは `@/generated/prisma/client` 経由でインポートする。
- バリデーション: `zod`
- PDF 生成: `@react-pdf/renderer`
- サーバ専用境界: `server-only`

App Router の起点は `src/app/page.tsx` です。ファイル保存で HMR されます。

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
