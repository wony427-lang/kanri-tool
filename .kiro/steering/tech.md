# Technology Stack

## Architecture

- **アプリケーションフレームワーク**: Next.js App Router（`src/app/` 配下のファイルベースルーティング）
- **レンダリング戦略**: 既定では React Server Components。クライアント状態が必要な箇所だけ `"use client"` を付与する
- **スタイリング**: Tailwind CSS v4 を PostCSS プラグインとして利用（`@import "tailwindcss";`）
- **バックエンド / 永続化**: Supabase（PostgreSQL）。Next.js Server Components / Server Actions / Route Handlers から ORM 経由で利用する
- **ORM**: Prisma（スキーマファースト、マイグレーションは `prisma migrate`）
- **認証**: Supabase Auth（メール + パスワード方式）。サーバ側で必ずセッション検証する
- **ストレージ**: Supabase Storage（添付ファイル：家族構成図／室内見取り図 等）
- **PDF 生成**: サーバ側（Route Handler / Server Action）で `@react-pdf/renderer` を利用する想定（design フェーズで最終確定）

詳細な規約は custom steering の `authentication.md` / `database.md` / `security.md` を参照する。

## Core Technologies

- **Language**: TypeScript 5（`strict: true`）
- **Framework**: Next.js `16.2.6`
- **UI Library**: React / React DOM `19.2.4`
- **Styling**: Tailwind CSS `^4`（`@tailwindcss/postcss`）
- **Runtime**: Node.js（Next.js 16 の要件に従う）
- **Database**: PostgreSQL（Supabase 提供）
- **BaaS**: Supabase（Auth / Database / Storage）
- **ORM**: Prisma `^5`

## Key Libraries

- `next/font`（`Geist`, `Geist_Mono`）でフォント最適化
- `next/image` を使った画像最適化（生 `<img>` は原則使わない）
- `@supabase/ssr` / `@supabase/supabase-js`: Supabase クライアント（Server Components 用と Browser 用を分離）
- `@prisma/client`: アプリケーションコードからの DB アクセス
- `zod` 等のスキーマバリデーション: フォーム送信値・Server Action 入力の検証（design 時に最終確定）
- `@react-pdf/renderer` 等の PDF 生成ライブラリ: 利用者基本情報 PDF 出力

それ以外のサードパーティ依存は最小限。新規追加時は「採用理由」を本ファイルか custom steering に追記する。

## Development Standards

### Type Safety
- `tsconfig.json` で `strict: true`、`noEmit: true`、`isolatedModules: true`
- `any` の使用は避け、必要な場合は理由をコメントで残す
- `moduleResolution: "bundler"` と `module: "esnext"` を前提に、ESM スタイルで記述する
- Prisma 生成型と zod スキーマを「DB／入出力境界」での型源泉として扱う

### Code Quality
- ESLint 9（flat config: `eslint.config.mjs`）
  - `eslint-config-next/core-web-vitals`
  - `eslint-config-next/typescript`
- 既定の ignore に加え、`.next/`, `out/`, `build/`, `next-env.d.ts` を明示的に除外
- リンタが指摘した内容はコミット前に解消する

### Testing
- 現時点ではテストフレームワーク未導入（フェーズ 1 実装着手時に Vitest 等の採用を検討）
- 導入時は `tech.md` を更新し、必要なら custom steering `testing.md` を追加する

### Server vs Client 分離
- Supabase / Prisma のクライアントは Server Components / Server Actions / Route Handlers でのみ呼び出す
- ブラウザに公開可能な値は `NEXT_PUBLIC_` プレフィックス付き環境変数のみ
- 認可チェックは「サーバ側で必ず実施」。クライアント UI の非表示のみに依存しない

## Development Environment

### Required Tools

- Node.js（Next.js 16 が要求するバージョン）
- npm（リポジトリには `package-lock.json` を同梱）
- Supabase CLI（ローカル開発・マイグレーション運用）
- Prisma CLI（`npx prisma ...`）

### Required Environment Variables（例）

| 変数 | 用途 | 公開範囲 |
|---|---|---|
| `DATABASE_URL` | Prisma 用 PostgreSQL 接続文字列 | サーバのみ |
| `DIRECT_URL` | Prisma migrate 用直接接続 | サーバのみ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | クライアント可 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon キー（RLS 前提） | クライアント可 |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバ専用の権限昇格キー | サーバのみ（厳重管理） |
| `SESSION_IDLE_TIMEOUT_MIN` | 未操作自動ログアウト分（既定 30） | サーバのみ |
| `LOGIN_LOCK_THRESHOLD` | 連続失敗ロック回数（既定 5） | サーバのみ |
| `LOGIN_LOCK_DURATION_MIN` | ロック継続分（既定 15） | サーバのみ |

実値はコミットせず、ローカルは `.env.local`、本番は秘密管理サービスに置く。

### Common Commands

```bash
# Dev:        npm run dev               # next dev で開発サーバ起動
# Build:      npm run build             # next build
# Start:      npm run start             # next start（本番ビルドの起動）
# Lint:       npm run lint              # eslint
# Prisma:
#   - Generate:   npx prisma generate
#   - Migrate dev: npx prisma migrate dev --name <change>
#   - Migrate deploy: npx prisma migrate deploy
#   - Studio:     npx prisma studio
# Supabase（CLI 利用時）:
#   - Local start: supabase start
#   - Local stop:  supabase stop
```

## Key Technical Decisions

- **App Router 採用**: ルーティングとレイアウト合成を `src/app/` のファイル構造で表現し、Server Components を既定にする
- **Tailwind v4 + PostCSS プラグイン構成**: `tailwind.config.*` を持たず、`globals.css` の `@theme inline` で CSS 変数からトークンを定義する設計（v4 のスタイルに従う）
- **CSS 変数によるテーマ**: `:root` で `--background` / `--foreground` 等を定義し、`prefers-color-scheme: dark` で上書きする（OS 設定に追従）
- **絶対パスエイリアス**: `@/*` を `./src/*` にマップし、深いネストでも相対パスを使わずに済むようにする
- **Supabase + Prisma の併用**: 認証・ストレージは Supabase が提供する SDK を利用し、業務データの読み書きは Prisma で型安全に行う。RLS（Row Level Security）よりもアプリケーション層の認可・施設スコープを一次防御層とし、RLS は二次防御として利用するかは design フェーズで決定する
- **PDF はサーバ生成**: 個人情報を含むため、PDF レンダリングはサーバ側で実行し、生成済みストリームを認可済みリクエストに対してのみ返す
- **個人情報前提のセキュリティ既定**: HTTPS 必須・`Cache-Control: no-store`・監査ログ・パスワードハッシュ化（Supabase Auth に委譲）等は spec `resident-management` の Req 16 と `security.md` で詳細を規定する

---
_主要フレームワークと標準のみを記載する。個別ライブラリの全列挙はしない。詳細規約は custom steering（`authentication.md` / `database.md` / `security.md`）に分割する。_
