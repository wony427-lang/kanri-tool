# Research & Design Decisions

## Summary

- **Feature**: `resident-management`
- **Discovery Scope**: New Feature（グリーンフィールド、Next.js スケルトンのみ・バックエンド未導入）
- **Key Findings**:
  1. Next.js 16 App Router で Supabase Auth を扱う標準は `@supabase/ssr`。ブラウザ／サーバ／プロキシ（旧 middleware）の 3 種クライアントを分け、サーバ側では `supabase.auth.getClaims()` を主検証手段、Server Action 内の権限境界では `supabase.auth.getUser()` を使うのが 2026 年現在の推奨パターン。
  2. Prisma + Supabase は **Pooled URL（Supavisor、ポート 6543、`?pgbouncer=true`）= `DATABASE_URL`** と **Direct URL（ポート 5432）= `DIRECT_URL`** の二段構成が必須。前者は実行時クエリ、後者はマイグレーション・introspection 用。
  3. サーバ生成 PDF は `@react-pdf/renderer` + Noto Sans JP（`Font.register` で `path.join(process.cwd(), "public/fonts/...")` の絶対パス指定）が最も確実。Route Handler 内で `renderToBuffer` → `new Uint8Array(buffer)` で返す。

## Research Log

### Supabase Auth × Next.js 16 App Router の標準パターン

- **Context**: 認証（Req 1）・認可（Req 2）・パスワード管理（Req 4）の基盤として Supabase Auth を採用する。Next.js 16 / App Router / Server Components 主体構成での現行ベストプラクティスを確認する必要があった。
- **Sources Consulted**:
  - [Creating a Supabase client for SSR | Supabase Docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
  - [Supabase Auth in Next.js App Router [2026 Guide] | SecureStartKit](https://securestartkit.com/blog/supabase-authentication-in-next-js-app-router-the-complete-2026-guide)
  - [Supabase Authentication with Next.js 15 Complete Production Guide 2026](https://www.iloveblogs.blog/guides/supabase-auth-nextjs-complete-guide-2026)
- **Findings**:
  - `@supabase/ssr` が正規パッケージ。旧 `@supabase/auth-helpers-nextjs` は非推奨。
  - クライアントは 3 種を**用途別に分離**する: `createBrowserClient`（クライアント側）、`createServerClient`（Server Component / Server Action / Route Handler）、proxy/middleware 用クライアント。
  - Server Components はクッキー書き込み不可。トークン更新は **proxy（Next.js 16 では `proxy.ts`）/ middleware** で行い、`request.cookies.set` / `response.cookies.set` で双方に反映する。
  - 検証は `getClaims()`（JWT 署名検証で高速）と `getUser()`（DB ヒット、最新性保証）を使い分ける。**ページ保護 = `getClaims()`、書き込み境界 = `getUser()`**。
  - 認証ロジックは **Server Action に寄せ、Route Handler は最小限** に保つのがモダンスタイル。
  - middleware matcher は静的アセットを除外する negative-lookahead パターンを使う。
- **Implications**:
  - `src/lib/supabase/` 配下に `browser.ts` / `server.ts` / `proxy.ts`（middleware 用）の 3 ファイルを作る方針。
  - 認証保護ルートは `src/middleware.ts`（または `src/proxy.ts`）で `getClaims()` ベースのリダイレクト判定。
  - 書込み系 Server Action 冒頭で `getUser()` → 役割・施設スコープを再検証する共通ガードを設ける。

### Prisma × Supabase（PostgreSQL）の接続戦略

- **Context**: ORM として Prisma、DB として Supabase Postgres を採用する。サーバレス／コンテナの双方を視野に入れる場合の接続構成を確認する必要があった。
- **Sources Consulted**:
  - [Prisma | Supabase Docs](https://supabase.com/docs/guides/database/prisma)
  - [Supabase | Prisma Documentation](https://www.prisma.io/docs/v6/orm/overview/databases/supabase)
  - [Connecting to your Prisma Postgres database](https://www.prisma.io/docs/postgres/database/connecting-to-your-database)
- **Findings**:
  - `DATABASE_URL`（Supavisor Transaction Pooler、ポート 6543）に `?pgbouncer=true` を必須付与。
  - `DIRECT_URL`（直接接続、ポート 5432）を **マイグレーション・introspection・Prisma Studio 用**に分離。
  - `schema.prisma` の `datasource db` に `url = env("DATABASE_URL")` と `directUrl = env("DIRECT_URL")` を併記する（Prisma v6 系構成）。
  - Prisma v7 では `prisma.config.ts` で `DIRECT_URL` を読む形式に変わる。本プロジェクトは v6 系で構築し、v7 リリース後に移行する。
  - 「prepared statement already exists」エラーは `?pgbouncer=true` 漏れが原因。
- **Implications**:
  - `.env.local` / 本番環境変数に `DATABASE_URL` と `DIRECT_URL` の 2 系統を必ず設定する（既に `tech.md` に明記済み）。
  - サーバ側で `PrismaClient` をシングルトン化する（dev でホットリロード時に多重生成しない `globalThis` ガード付き）。
  - 認可・施設スコープは Prisma 側で強制せず、サービス層で一元化する（後述）。

### サーバ側 PDF 生成（日本語対応）

- **Context**: Req 13 の利用者基本情報 PDF をサーバ側で生成し、認可済みリクエストのみに返す必要がある。日本語フォント埋め込みが文字化け対策として必須。
- **Sources Consulted**:
  - [Generating Japanese PDF Reports with Next.js and @react-pdf/renderer | Zenn](https://zenn.dev/orectic/articles/react-pdf-renderer-japanese-pdf?locale=en)
  - [@react-pdf/renderer with Japanese fonts | Qiita](https://qiita.com/k2a_Y4a/items/7cb4558808088593e8a5)
- **Findings**:
  - `@react-pdf/renderer` の `renderToBuffer` で React 風 PDF コンポーネントをサーバ側でレンダリングできる。Route Handler から `NextResponse` で返却する。
  - Buffer → `Uint8Array` 変換を忘れるとバイナリ破損。
  - 日本語フォント（Noto Sans JP）は `Font.register` で **絶対パス**指定が必須。`process.cwd()` ベースで `public/fonts/NotoSansJP-*.ttf` を参照。
  - `Font.register` はサーバ起動後 1 回だけ実行（モジュールトップで遅延初期化）。
  - 代替候補（jsPDF・pdfmake・pdf-lib）と比較し、React 風コンポーネント分割・型安全性で `@react-pdf/renderer` が最適。
- **Implications**:
  - `src/lib/pdf/` に `register-fonts.ts`（一度だけ実行）と `documents/ResidentProfilePdf.tsx` を配置する。
  - PDF 用 Route Handler は `/api/residents/[id]/pdf` 等で配置し、認可・施設スコープを再検証してから生成・返却する。
  - フォントファイルは `public/fonts/` に Noto Sans JP の Regular と Bold の 2 ウェイトを配置（容量と表現力のバランス）。

### Next.js 16 / React 19 / Tailwind v4 整合性

- **Context**: 既存の `package.json` は Next.js 16.2.6 / React 19.2.4 / Tailwind v4。`@supabase/ssr` / `@supabase/supabase-js` / Prisma 6 / `@react-pdf/renderer` の最新版が全て対応していることを確認。
- **Findings**:
  - `@supabase/ssr` は Next.js 13+ 全系統で動作。Next.js 16 の Server Components / Server Actions / proxy（middleware）パターンに完全対応。
  - Prisma 6 は Node.js 18+ と Next.js App Router で問題なし。
  - `@react-pdf/renderer` は React 19 / Next.js 16 で動作。
  - Tailwind v4 の `@theme inline` 構成は既存の `globals.css` に確立済み。本 spec 用に色・余白トークンを拡張する。
- **Implications**:
  - 既存スケルトン（`src/app/page.tsx`, `layout.tsx`, `globals.css`）はトップページとして「ログイン画面へのリダイレクト」に置き換える。
  - フォント設定（Geist 系）は管理画面では不要のため、Noto Sans JP / Inter 等の日本語前提構成に差し替えるかは design で決定（既定は Geist 維持 + 必要箇所のみ Noto Sans JP の検討）。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| **Layered (Types → Repository → Service → Action/Route → UI)** | 関心ごとを水平レイヤーに分離。依存方向を一方向に強制 | レビュー容易・型境界明確・テスト容易・Server Components ファーストに合致 | レイヤー間ボイラープレートが多い | **採用**。Spec のドメイン数（13 ドメイン）と認可・スコープの横串要件に最適 |
| Hexagonal（ポート＆アダプタ） | ドメインを核に、外部 I/O をアダプタで包む | 完全な疎結合・テスタビリティ高 | フェーズ 1 の規模に対しオーバーエンジニアリング | 採用見送り（フェーズ 2／3 で必要になれば段階導入） |
| Vertical Slice（機能ごとに完結） | ドメインごとにスタックの全レイヤを縦割り | 機能単位の独立性・並行開発容易 | UI 基盤・認可・施設スコープの共通化が困難 | 部分採用（ドメインモジュール単位で縦割り、ただし横串の `shared/auth`・`shared/ui` を持つハイブリッド） |
| Event-driven / CQRS | 書き込みと参照を分離、イベントで連携 | 拡張性高 | 個人情報・監査要件に対してインフラ複雑度が過大 | 採用見送り |

→ **Layered + Vertical Slice ハイブリッド**を採用。共通レイヤ（auth / authorization / ui / db）を横串で持ちつつ、業務ドメインを `src/domains/<name>/` に縦割り配置する。

## Design Decisions

### Decision: Supabase Auth + アプリ層 RBAC の二層認可

- **Context**: 認証は Supabase Auth に委譲しつつ、3 役割 + 施設スコープの細かい認可は本アプリ仕様（Req 2・15）。Supabase RLS と Prisma 経由のサービス層認可の関係を明確化する必要がある。
- **Alternatives Considered**:
  1. **RLS のみ**: Supabase JS から直接 RLS 経由でアクセス。型安全性が `@supabase/ssr` 型に依存。
  2. **アプリ層認可のみ**: Prisma 経由でサーバから読み書きし、認可は service 層で実施。RLS は使わない。
  3. **二層**: Prisma 経由を一次防御、RLS を二次防御に。
- **Selected Approach**: **二層方針（Prisma を一次防御線、Supabase Storage や直接 DB アクセス箇所のみ RLS を二次防御）**。
  - 業務データの読み書きは Server Action / Server Component から **Prisma 経由**で行い、authorization service が役割と施設スコープを必ず適用する。
  - Supabase Storage（添付ファイル）は Supabase 側の Bucket ポリシー（実質 RLS）で**第二の防御線**を作る。
  - DB ロールは Prisma 用に専用ロール（RLS バイパス権限）を発行する。
- **Rationale**:
  - 認可ロジックを TypeScript で完結させ、レビュー・テスト・型保証が容易。
  - RLS だけだと、複雑な施設スコープ（admin の施設フィルタ切替等）を SQL ポリシーで表現するのが煩雑。
  - 二層にしておけば、アプリ層の認可漏れが起きた際に Storage 経由の漏洩を防げる。
- **Trade-offs**:
  - DB レベルの完全防御は弱まる（service 層バグが SQL に届く可能性）。
  - これは「サービス層を 1 か所に集約」「テストを必須化」で軽減する。
- **Follow-up**: design.md の "Security Considerations" で運用ガードレールを明文化。

### Decision: ドメインモジュール構成（縦割り）と共通レイヤ（横串）の分離

- **Context**: 25 要件・13 ドメインを Next.js App Router に展開するにあたり、ファイル構造を一貫させる必要がある。
- **Selected Approach**:
  - `src/app/(app)/<domain>/` … ルート（Server Components 主体、`page.tsx` / `layout.tsx`）
  - `src/domains/<domain>/` … ドメインロジック（repository / service / schemas / actions）
  - `src/shared/` … UI 基盤・auth・authorization・db・supabase・pdf・nav 等の横串
- **Rationale**: ドメイン追加（将来のフェーズ 2／3）を `src/app/(app)/billing/` + `src/domains/billing/` の追加だけで完結させられる。共通レイヤを横串に分離することで重複実装を防ぐ。
- **Trade-offs**: 1 機能で 2 ディレクトリを編集することになるが、責務分離のメリットが上回る。

### Decision: 利用者の保険は 1:1 をベースに「履歴テーブルを別途持つ」設計

- **Context**: 介護保険・医療保険・障害福祉は基本 1 利用者 1 件（現行有効）。一方、認定更新・期間延長等で**過去履歴**の参照が要件 8-7（年度履歴）等で求められる。
- **Selected Approach**:
  - 現行値: 利用者プロファイル直下に **正規化テーブル**（`care_insurance`・`medical_insurance`・`disability_welfare_info`）を 1:1 で持つ。
  - 履歴: 公費（Req 7-5）と利用者総合保険（Req 8）は最初から 1:N（履歴テーブル）。他保険の更新履歴は **`audit_logs` に変更差分として記録**して二次的に追跡可能とする。
- **Rationale**: 「現行有効値の参照」と「履歴閲覧」の頻度差に合わせ、書き込み複雑度を最小化。完全な履歴テーブルが必要になればフェーズ 2／3 で拡張可能。
- **Trade-offs**: 介護保険等の履歴復元には監査ログを跨ぐ必要があるが、フェーズ 1 では運用上問題なし。

### Decision: ファイル添付は Supabase Storage の非公開バケット + サーバ経由配信

- **Context**: 家族構成図・室内見取り図は個人情報を伴う。Req 11-4 で「直接 URL 公開しない」が必須。
- **Selected Approach**:
  - Supabase Storage の非公開バケット `resident-attachments` を用意。
  - パス階層: `{facility_id}/{resident_id}/{uuid}.{ext}`。
  - 取得は **Route Handler `/api/attachments/[id]`** が認可検証 → 署名 URL を発行（または直接ストリーム）。
  - DB には `storage_path` / `mime_type` / `byte_size` / `uploaded_at` のみ保持。
- **Rationale**: ブラウザから直接 Supabase Storage 公開 URL を踏ませる構成は認可漏れリスクが高い。サーバ経由配信で認可と監査を一元化する。

### Decision: PDF はサーバ側 `@react-pdf/renderer` + Noto Sans JP

- **Selected Approach**: `/api/residents/[id]/pdf` Route Handler で `renderToBuffer` → `Uint8Array` 化して返却。Noto Sans JP を `public/fonts/` に同梱し `Font.register` で絶対パス指定。
- **Rationale**: 個人情報を含むため、クライアント側生成は不可。React 風 PDF 定義で型安全・部品分割が容易。
- **Trade-offs**: フォント同梱でリポジトリサイズが約 4-8MB 増加（許容）。

## Risks & Mitigations

- **R1: 認可漏れ（service 層バグ）** → 認可・施設スコープを `requirePermission()` / `getAccessibleFacilityIds()` の単一実装に集約。Prisma クエリは必ずこのヘルパ経由でフィルタ。Server Action 単体テストを必須化。
- **R2: Supabase Auth と Prisma の user ID 不整合** → `staff_accounts.auth_user_id` を Supabase Auth の `auth.users.id` と 1:1 リンク。新規登録は管理者画面 → Server Action が両方を同一トランザクション境界で作成（Supabase Auth API + Prisma INSERT）。失敗時の補償処理を明記。
- **R3: PDF サーバ生成時の OOM**（大きな利用者で生成失敗） → 1 利用者単位での生成のため通常は問題なし。10 ページ超の利用者は warning ログ＋分割案を Phase 2 で検討。
- **R4: 期限アラート計算の性能** → 利用者数が増えると毎回の全スキャンが重くなる。インデックス（`(facility_id, end_date)`）を最初から付与。1 万人規模までは views + index で十分。それ以上は Phase 2 で集計テーブル化を検討。
- **R5: 監査ログの肥大化** → `audit_logs` を最初からパーティション設計（月単位）を視野に入れる。フェーズ 1 では単一テーブルで開始し、年単位アーカイブ運用を `database.md` 規約に従って準備。
- **R6: ロックアウト機構を Supabase Auth が標準提供しない** → アプリ層で `login_attempts` テーブルを持ち、Server Action でロック判定。Supabase Auth の認証要求の前段に挟む。
- **R7: ファイルアップロードのウイルス混入** → フェーズ 1 ではサーバ側のウイルススキャンは未実装。MIME / 拡張子 / サイズ検証で最低限の防御を行い、将来 ClamAV 等の連携を検討（`security.md` の運用フェーズで追記）。

## References

- [Creating a Supabase client for SSR | Supabase Docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — `@supabase/ssr` の正規ガイド
- [Supabase Auth in Next.js App Router 2026 Guide | SecureStartKit](https://securestartkit.com/blog/supabase-authentication-in-next-js-app-router-the-complete-2026-guide) — Next.js 16 / proxy.ts / getClaims のベストプラクティス
- [Prisma | Supabase Docs](https://supabase.com/docs/guides/database/prisma) — Pooled / Direct URL の二段構成
- [Supabase | Prisma Documentation](https://www.prisma.io/docs/v6/orm/overview/databases/supabase) — Prisma v6 系での `directUrl` 設定
- [Generating Japanese PDF Reports with Next.js and @react-pdf/renderer | Zenn](https://zenn.dev/orectic/articles/react-pdf-renderer-japanese-pdf?locale=en) — サーバ側日本語 PDF 生成パターン
- 内部 steering: `.kiro/steering/{tech,authentication,database,security}.md`
