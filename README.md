# kanri-tool

介護施設の利用者情報を一元管理する社内向け Web アプリ。詳細は `.kiro/steering/` と `.kiro/specs/resident-management/` を参照してください。

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
