# Implementation Plan

> 本タスクは `requirements.md`（25 要件、ID `1.1`〜`25.6`）と `design.md` のコンポーネント・インタフェース定義に基づき、Foundation → Core → Integration → Validation の順に並ぶ。`(P)` は同一親直下で並行実行可能なサブタスク。`_Boundary:_` は design.md の Component Summary 表の名称を参照する。

## Foundation

- [x] 1. 依存導入とアプリ基盤の初期セットアップ
- [x] 1.1 必須依存パッケージの追加と最小起動確認
  - `@supabase/ssr`, `@supabase/supabase-js`, `prisma`, `@prisma/client`, `zod`, `@react-pdf/renderer` を `package.json` に追加し、`npm install` を実行する
  - `npm run dev` が既存スケルトンと同等に起動することを確認する
  - 開発者向けセットアップ手順を `README.md` の冒頭に最小限追記する
  - 観測条件: `npm run dev` がエラー無く起動し、追加依存が `node_modules` に解決済みであること
  - _Requirements: 1.1, 4.1, 5.1, 7.1, 11.1, 13.1_

- [x] 1.2 環境変数定義と起動時バリデーション
  - `.env.example` に `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_IDLE_TIMEOUT_MIN`, `LOGIN_LOCK_THRESHOLD`, `LOGIN_LOCK_DURATION_MIN` を記載する
  - サーバ起動時に必須環境変数を zod で検証し、不足時にプロセスを停止する設定モジュールを作る
  - クライアントに `NEXT_PUBLIC_` 以外が露出しないよう公開／非公開を型レベルで分離する
  - 観測条件: 必須環境変数が欠落した状態でビルドまたは起動するとエラーで停止すること
  - _Requirements: 1.1, 16.6, 16.7_

- [x] 1.3 Prisma 初期化と Supabase 接続の確立
  - `prisma init` で `prisma/schema.prisma` を作成し、`url=env("DATABASE_URL")` と `directUrl=env("DIRECT_URL")` を設定する
  - Prisma クライアントを `globalThis` ガードで singleton 化し、開発時のホットリロードでも多重生成しないようにする
  - 接続確認用の最小マイグレーションを発行し、`prisma migrate dev` が成功することを確認する
  - 観測条件: `prisma migrate dev` が空 or 最小スキーマで成功し、アプリから DB へクエリ可能であること
  - _Requirements: 1.1, 5.1, 7.1_

- [x] 1.4 Supabase クライアント基盤（browser / server / proxy / admin）の構築
  - ブラウザ用、Server Components / Server Actions / Route Handlers 用、middleware (proxy) 用、admin (service role) 用の 4 クライアントファクトリを用意する
  - 認証検証は middleware で `getClaims()`、Server Action 境界で `getUser()` を使う規約を実装ヘルパとして配置する
  - 観測条件: 4 種クライアントのいずれもサーバ／クライアントの境界違反なく型エラーゼロでビルドできること
  - _Requirements: 1.1, 1.8, 2.5_

- [x] 1.5 テスト基盤（Vitest）の導入
  - `vitest` と React Testing Library 等を追加し、`npm test` で実行できる最小スクリプトを `package.json` に追加する
  - 共通ユーティリティ（fake session、fake repository モック）を `tests/utils/` に配置する
  - 観測条件: サンプルテストが 1 件成功で実行されること
  - _Requirements: 2.1, 4.1, 5.1_

- [x] 2. データベーススキーマと初期マイグレーション
- [x] 2.1 コアエンティティのスキーマ定義（施設・職員・所属関係・ロックアウト）
  - `facilities`, `staff_accounts`（`auth_user_id` を Supabase Auth ユーザーと 1:1）, `staff_account_facilities`（N:N）, `login_attempts` を定義する
  - 命名・型・タイムスタンプは `database.md` の規約に準拠する（`snake_case`, `timestamptz`, UUID PK）
  - `role` `ENUM(admin, staff, viewer)` と `is_active`, `last_login_at` を `staff_accounts` に持つ
  - 観測条件: `prisma migrate dev` でテーブルが作成され、必要な UNIQUE / FK 制約が適用されていること
  - _Requirements: 1.6, 2.1, 3.1, 3.2, 3.4, 15.1, 15.5_

- [x] 2.2 利用者・医療ケア・緊急連絡先のスキーマ定義
  - `residents`, `medical_care_info`（1:1）, `emergency_contacts`（1 利用者最大 2 件、`sort_order` 1/2 で UNIQUE）を定義する
  - `usage_status` を `ENUM(active, discharged, scheduled, paused)` で制約し、退去日との CHECK 制約を可能な範囲で実装する
  - 観測条件: `prisma migrate dev` でテーブル作成成功、`emergency_contacts` の `(resident_id, sort_order)` UNIQUE が機能すること
  - _Requirements: 5.1, 5.3, 5.4, 10.1, 10.2, 10.3_

- [x] 2.3 保険情報（介護・医療・障害福祉・公費）のスキーマ定義
  - `care_insurance`（1:1）, `medical_insurance`（1:1）, `disability_welfare_info`（0..1）, `public_expense_records`（1:N）を定義する
  - 期間系列に `period_start <= period_end` の CHECK 制約を付ける
  - 各保険番号項目に必要な型・桁数制約を付与する
  - 観測条件: マイグレーション成功 + 期間整合違反データの INSERT が CHECK で拒否されること
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8_

- [x] 2.4 利用者総合保険（履歴）と添付・連携キー・対応状況のスキーマ定義
  - `comprehensive_insurance_records`（1 利用者複数年度、`billing_status`, `payment_status` ENUM）を定義する
  - `external_vendor_keys`（UNIQUE(`resident_id`,`vendor_type`,`vendor_name`)）を定義する
  - `resident_attachments`（`kind` ENUM=`family_chart`/`floor_plan`）と `alert_status_updates` を定義する
  - 観測条件: マイグレーション成功と各 UNIQUE / ENUM の動作確認
  - _Requirements: 8.1, 8.4, 8.7, 9.4, 11.2, 12.1, 12.2, 12.3_

- [x] 2.5 監査ログのスキーマ定義
  - `audit_logs`（`kind` ENUM, `actor_staff_account_id`, `target_type`, `target_id`, `ip`, `metadata` jsonb, `created_at`）を定義する
  - 検索効率のため `(created_at desc)` と `(actor_staff_account_id, created_at desc)` のインデックスを付与する
  - 観測条件: マイグレーション成功 + テストデータ INSERT が機能すること
  - _Requirements: 16.1, 16.2, 16.5_

- [x] 2.6 期限アラート view と性能インデックスの整備
  - `v_insurance_alerts` view を作成し、`care_insurance.period_end` / `medical_insurance.expires_at` / `disability_welfare_info.period_end` / `care_insurance.burden_ratio_expires_at` / `public_expense_records.expires_at` / `comprehensive_insurance_records.end_date` を UNION ALL して `(insurance_kind, end_date, remaining_days, bucket)` を返す
  - 各源泉テーブルに `(facility_id, end_date)` インデックスを付ける
  - `residents (facility_id, name_kana)` と `residents (facility_id, usage_status)` のインデックスを付ける
  - 観測条件: view が `SELECT * FROM v_insurance_alerts` で 6 種の保険を集計し、bucket（expired/within_30/60/90）が日付計算で適切に分類されること
  - _Requirements: 9.1, 9.2, 9.3, 9.5, 14.1_

## Core: 共通 UI 基盤

- [x] 3. デザイントークン拡張と UI 共通基盤
- [x] 3.1 デザイントークンと globals.css 拡張
  - 既存 `globals.css` にプライマリ・成功・警告・エラー・muted の色トークンと、余白／角丸／影／タイポグラフィのトークンを CSS 変数で追加する
  - `prefers-color-scheme: dark` でダーク向け値に切り替える
  - Tailwind v4 `@theme inline` 経由でユーティリティクラスから参照可能にする
  - 観測条件: サンプル画面で `text-primary` / `bg-muted` などのユーティリティが OS テーマに追従して表示されること
  - _Requirements: 22.1, 22.2, 22.3, 22.5_

- [x] 3.2 (P) UI プリミティブ（Button / Input / Select / Modal / Toast）の実装
  - 5 種のプリミティブを Server / Client の境界に従い実装し、テーマ変数からスタイリングする
  - `disabled` 状態、キーボード操作（Tab / Enter / Esc）、Modal のフォーカストラップ、Toast の `role=status/alert` を満たす
  - `prefers-reduced-motion: reduce` でアニメーションを抑制する
  - 観測条件: Storybook 相当のデモ画面（または `/dev` ルート）で 5 プリミティブを操作可能で、キーボード操作のみで全機能が動くこと
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 25.1, 25.2, 25.3, 25.6_
  - _Boundary: UI Kit_

- [x] 3.3 (P) DataTable コンポーネントの実装
  - 列定義・行データ・ソート可否・ローディング行スケルトン・空状態・エラー再試行・ページング・行クリック (Enter) を実装する
  - 表示時に毎回最新の props を反映する設計（キャッシュなし）
  - 観測条件: モックデータでソート・ページング・空状態・エラー再試行が動作すること
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_
  - _Boundary: DataTable_

- [x] 3.4 (P) Form コンポーネントの実装
  - ラベル・入力・補助テキスト・エラー表示の縦並びレイアウト、`aria-invalid`、送信中の二重送信抑止、成功 Toast、キャンセル時の破棄確認を実装する
  - サーバ側 zod エラーをフィールド単位／フォーム全体のいずれにも割り当てて表示できる API を提供する
  - 観測条件: モック Server Action と組み合わせて、検証エラー・送信中・成功・失敗の各状態が UI に正しく現れること
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_
  - _Boundary: Form_

- [x] 3.5 (P) AppShell とナビゲーション基盤の実装
  - ヘッダー＋サイドナビ＋メインの 3 領域シェルを Server Components で構築し、未認証ルートでは表示しない
  - 設定駆動ナビゲーション（ラベル・パス・アイコン・必要権限・並び順）を実装し、`aria-current="page"` で現在地強調
  - モバイル幅でオフキャンバスに切り替え、選択直後に自動で閉じる
  - ヘッダー右側にユーザー名／所属施設／ログアウト導線／（管理者向け）施設フィルタを置く
  - 観測条件: 認証必須レイアウト配下で全画面共通のヘッダー／ナビが表示され、画面遷移で再マウントしないこと
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_
  - _Boundary: AppShell + Navigation_

- [x] 3.6 ページレイアウトテンプレート（List / Detail / Create / Edit）の実装
  - 各テンプレートを Server Components ファーストで合成可能にし、タイトル・サブタイトル・主要アクション・フィルタ／本文／フォームスロットを Props で受け取る
  - List は `DataTable` スロット、Create/Edit は `Form` スロットを内包する
  - 観測条件: 各テンプレートを使ったサンプル画面が App Router 上で表示できること
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_
  - _Depends: 3.3, 3.4, 3.5_

- [x] 3.7 ローディング／エラー境界の共通ラッパ実装
  - スケルトンと「再試行」付きフォールバックの共通コンポーネントを用意し、各ルート配下の `loading.tsx` / `error.tsx` から利用する
  - 認可エラー（403）時は「権限がありません」と一覧画面への戻り導線を提示する
  - 例外のスタックトレース・PII をユーザー画面に露出させない
  - 観測条件: 任意の page で意図的に throw した場合に、画面遷移なしでフォールバックが表示され、`reset()` 操作で再描画されること
  - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6_

## Core: 認証・認可・監査基盤

- [x] 4. 認証・認可・監査ログ基盤
- [x] 4.1 ミドルウェアでのセッション更新と未認証リダイレクト
  - `src/middleware.ts` を新規作成し、`@supabase/ssr` の middleware クライアントで `getClaims()` を呼んでクッキーを更新する
  - 認証必須ルート配下で未認証ユーザーをログイン画面へリダイレクトする
  - matcher は静的アセット（`/_next/*`, `/favicon*`, `/fonts/*` 等）を除外する
  - 観測条件: 未認証で `/dashboard` にアクセスすると `/login` に 302、認証済みなら通過することを確認できる
  - _Requirements: 1.1, 1.8_

- [x] 4.2 (P) 認可サービス（requirePermission / getAccessibleFacilityIds）の実装
  - 役割（admin / staff / viewer）× Permission 列挙の許可マトリクスを `authentication.md` 準拠で実装する
  - `SessionContext` を返す `requireSession()` / `requirePermission()` / `requireAdminOnly()` を提供する
  - 利用者・保険等のリポジトリが必ず使う `getAccessibleFacilityIds(session, requested?)` を実装する
  - 役割 × Permission の許可表をテーブルテストで全網羅する
  - 観測条件: 全 Permission × 全 Role の許可／拒否が単体テストでグリーン、`is_active=false` は常に拒否される
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 15.2, 15.3, 15.5, 15.6_
  - _Boundary: Authorization Service_

- [x] 4.3 監査ログサービスの実装
  - `writeAuditLog(event)` を提供し、PII を `metadata` に含めない型制約を強制する（`Record<string, string | number | boolean>`）
  - `listAuditLogs` を admin 専用とし、施設スコープ・期間・種別フィルタ・カーソルページングに対応する
  - 観測条件: 任意の Server Action から呼び出すと `audit_logs` に行が挿入され、admin 画面（後続タスク）から参照できる
  - _Requirements: 16.1, 16.2, 16.3, 16.5_
  - _Boundary: Audit Log Service_

- [x] 4.4 ログイン / ログアウト Server Action とロックアウト判定
  - ログイン画面（`(auth)/login/page.tsx`）と `signIn` Server Action を実装する
  - `login_attempts` テーブルを直近 N 分でカウントしてロック判定する（既定 5 回 / 15 分）
  - 認証成功時に `last_login_at` を更新し、`audit_logs.login_success` を記録する
  - 失敗・ロック・ログアウト時も監査ログを残す
  - ログイン失敗メッセージは ID 存在の有無を開示しない一般化メッセージとする
  - 観測条件: 5 回失敗で 15 分ロックがかかり、ロック中の試行が拒否され、ロック解除後に再ログイン可能となること
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8, 3.5_
  - _Boundary: Auth Service_

- [x] 4.5 セッション自動失効（未操作タイムアウト）の実装
  - 直近操作時刻をサーバ側で保持し、規定時間（既定 30 分）経過時に次回操作で失効させる
  - middleware または Server Action 境界で経過判定し、超過時はクッキーを破棄してログイン画面へリダイレクトする
  - 観測条件: 規定時間以上未操作後の操作でログイン画面へリダイレクトされること
  - _Requirements: 1.4, 1.5_
  - _Boundary: Auth Service_

- [x] 4.6 パスワード再設定フロー（管理者リセット起点）
  - 管理者によるリセット要求から、Supabase Auth の再設定 URL メール送信を発火する Server Action
  - 再設定 URL 画面（`(auth)/reset-password/[token]/page.tsx`）で新パスワードを設定し、既存セッションをすべて失効させる
  - 強度ポリシー（最小文字数・文字種混在）を強制し、URL は 24 時間で失効する
  - 観測条件: リセット → メール受信 → URL から新 PW 設定 → 旧セッション失効 → 新 PW でログイン可能、までが通る
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

## Core: 管理機能とドメインサービス

- [x] 5. 職員アカウントと施設マスタ管理（admin only）
- [x] 5.1 施設マスタ管理（CRUD と admin only 認可）
  - `facilities` の CRUD と利用停止（`is_active=false`）を提供する
  - 一覧／詳細／作成／編集を List/Detail/Create/Edit テンプレートで実装する
  - 認可・監査ログ・施設変更時の `audit_logs.facility_*` 記録を行う
  - 観測条件: admin で施設の追加・名称変更ができ、staff/viewer はメニュー非表示かつ直アクセス時に 403 となる
  - _Requirements: 15.1, 15.4, 15.6, 16.1_
  - _Boundary: Facility Service_

- [x] 5.2 職員アカウント管理（Supabase Auth と Prisma の同期）
  - 新規登録時に Supabase Auth ユーザーと `staff_accounts` を同一境界で作成し、失敗時の補償処理を入れる
  - 編集（所属施設・役割・利用状態）と利用停止時に当該ユーザーの有効セッションをすべて失効させる
  - 自身のアカウントを自身で停止できない／最後の有効管理者を停止できない保護を入れる
  - ログイン ID とメールアドレスの一意性を検証する
  - 観測条件: 新規アカウント作成→当該職員がログイン可、停止→当該職員の次回操作で 401 となること
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_
  - _Boundary: Staff Account Service_

- [x] 5.3 職員パスワードリセット UI（管理者起点）
  - 職員一覧の各行から「パスワードリセット」を実行可能にする
  - 管理者画面に新パスワードや仮パスワードを表示せず、Supabase Auth のメール送信のみで完結する
  - リセット要求を `audit_logs.password_reset_requested` に記録する
  - 観測条件: 任意の職員に対し管理者がリセットを発行でき、メール経由のみで新パスワード設定が可能となる
  - _Requirements: 4.3, 4.4, 16.1_
  - _Depends: 4.6_

- [x] 6. 利用者基本情報管理
- [x] 6.1 利用者リポジトリ（施設スコープ強制・検索 SQL）の実装
  - `search`, `findById`, `create`, `update`, `delete` を提供し、すべてのクエリで `facilityIds` フィルタを必須にする
  - 氏名／フリガナの ILIKE 部分一致、要介護度・施設・利用状況の完全一致、主治医・ケアマネの部分一致、AND 結合、オフセットページング、ソートを実装する
  - 観測条件: 施設 A の利用者を施設 B 職員のスコープで `findById` した場合に null を返すこと（情報隠蔽）
  - _Requirements: 5.1, 6.2, 6.3, 6.7, 15.2_

- [x] 6.2 利用者サービス（CRUD + 監査 + 整合性）の実装
  - `createResident` / `updateResident` / `deleteResident` を実装し、CUD は監査ログと同一トランザクションで保存する
  - 必須項目欠落・フリガナのカタカナ以外・退去日整合違反を zod とサービス層の二段で拒否する
  - 利用状況を「退去済み」に変更した時は退去日必須、「入居中」「入居予定」に戻したときは退去日を無効化する
  - 観測条件: 退去日未入力で「退去済み」更新が失敗、必須項目欠落で登録が失敗、これらが単体テストでグリーン
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 16.1_
  - _Boundary: Resident Service_

- [x] 6.3 利用者一覧画面（検索フィルタ + DataTable）の実装
  - フィルタ UI（氏名・要介護度・所属施設・主治医・ケアマネ・利用状況）と検索 Server Action を実装する
  - 表示列（利用者名・生年月日・年齢・要介護度・所属施設・主治医・担当ケアマネ・利用状況）を `DataTable` で提供する
  - 0 件時の空状態と検索条件見直し導線、ページングを実装する
  - 「閲覧専用」ユーザーには新規作成・PDF 出力ボタンを非活性 / 非表示にする
  - 観測条件: 各フィルタ条件で検索結果が AND で絞り込まれ、ページング・ソートが機能する
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 6.4 利用者詳細画面の実装
  - Detail テンプレートで基本情報・施設情報・利用状況・年齢（派生）を表示する
  - 編集・削除・PDF 出力への遷移ボタンを役割に応じて出し分ける
  - 観測条件: 詳細画面が完全表示され、施設スコープ外の利用者は 404 として表示される
  - _Requirements: 5.1, 5.2, 5.8, 6.1, 15.2_

- [x] 6.5 利用者新規作成画面と Server Action
  - Create テンプレートでフォームを構築し、zod スキーマで入力検証する
  - 成功時に詳細画面へ遷移し、成功 Toast を表示する
  - 観測条件: 必須項目を満たした登録が成功し、一覧に反映される
  - _Requirements: 5.1, 5.3, 5.6, 5.7, 20.1, 20.2, 20.5_

- [x] 6.6 利用者編集画面と Server Action
  - 既存値プリフィル付き Edit テンプレートで実装し、未保存変更があるキャンセル時は破棄確認を表示する
  - 退去日整合・必須項目チェック・施設スコープ拒否を Server Action で再検証する
  - 観測条件: 編集成功で詳細画面に反映、施設スコープ外の利用者 ID への直接 POST は 403／404 となる
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.8, 5.9, 20.6_

- [x] 6.7 利用者削除 Server Action と確認ダイアログ
  - 削除を Destructive ボタン + 確認モーダルで提供する
  - 削除時に添付ファイルもストレージから削除する（後続タスク 12 と統合）
  - 削除イベントを `audit_logs.resident_deleted` に記録する
  - 観測条件: 削除後に一覧から消え、再度詳細を開くと 404、添付がストレージから消えること
  - _Requirements: 11.5, 16.1_
  - _Depends: 12.2_

- [x] 7. 医療・ケア・緊急連絡先・補足情報の管理
- [x] 7.1 医療機関・ケアマネ情報の編集機能
  - `medical_care_info` の upsert を Server Action と詳細画面のサブセクションとして実装する
  - 主治医・ケアマネ・医療機関名を検索の対象キー（タスク 6.3）と整合する形で保持する
  - 観測条件: 詳細画面から医療機関・ケアマネ情報を編集でき、検索キーとして機能する
  - _Requirements: 10.1, 10.2, 10.5_

- [x] 7.2 緊急連絡先（最大 2 件）の管理
  - 連絡先 1／2 のフォームと upsert を実装し、`sort_order` で 1/2 を区別する
  - 連絡先 1 の電話・携帯がいずれも未入力時に警告（登録は許容）
  - 連絡先 2 がある状態で連絡先 1 を空にしようとした場合はエラーで拒否
  - 観測条件: 上記制約がフォーム・サーバの両方で機能すること
  - _Requirements: 10.3, 10.4, 10.6_

- [x] 7.3 病歴・備考の編集
  - 自由記述テキストエリアを詳細画面に配置し、upsert する
  - 観測条件: 編集内容が保存され、再表示でプリフィルされること
  - _Requirements: 11.1_

- [x] 8. 保険情報管理（介護・医療・障害福祉・公費）
- [x] 8.1 (P) 介護保険の管理（service + UI）
  - `care_insurance` の upsert（保険者番号・被保険者番号・要介護度・認定日・認定有効期間・負担割合証・有効期限）を実装する
  - 期間整合と桁数バリデーションを zod とサービス層で重ねる
  - 詳細画面のサブセクションで編集 UI を提供する
  - 観測条件: 期間違反 / 桁数違反データの保存が拒否され、正常データが保存・表示される
  - _Requirements: 7.1, 7.2, 7.6, 7.7, 7.8_
  - _Boundary: Insurance Service_

- [x] 8.2 (P) 医療保険の管理
  - `medical_insurance` の upsert（保険者番号・被保険者番号・有効期限）を実装する
  - 観測条件: 編集 UI と保存が機能、期限が後続のアラート対象になる
  - _Requirements: 7.1, 7.3, 7.6, 7.7_
  - _Boundary: Insurance Service_

- [x] 8.3 (P) 障害福祉情報の管理
  - `disability_welfare_info` の upsert（受給者証番号・障害支援区分・サービス種別・支給決定期間・支給量）を実装する
  - 期間整合バリデーションを行う
  - 観測条件: 編集と期間バリデーションが機能、期限が後続のアラート対象になる
  - _Requirements: 7.1, 7.4, 7.6, 7.7, 7.8_
  - _Boundary: Insurance Service_

- [x] 8.4 公費情報の管理（1:N）
  - `public_expense_records` の追加・編集・削除を一覧 UI で提供する
  - 公費種別・有効期限・負担者番号・受給者番号・本人負担額を保持する
  - 観測条件: 1 利用者に対し複数件登録でき、各件が後続のアラート対象になる
  - _Requirements: 7.1, 7.5, 7.6, 7.7_
  - _Boundary: Insurance Service_

- [x] 9. 利用者総合保険（年払い）管理
- [x] 9.1 利用者総合保険サービスと次回請求日自動計算
  - `comprehensive_insurance_records` の upsert と「直近基準日 + 1 年」での `nextBillingDate` 自動算出を実装する
  - 加入有無が「未加入」の場合は計算と未請求一覧計上を行わない
  - 履歴閲覧（複数年度）API を提供する
  - うるう年・月末跨ぎを含めた `addYears` の単体テストを書く
  - 観測条件: 任意基準日に対する次回請求予定日が単体テストでグリーン
  - _Requirements: 8.1, 8.2, 8.6, 8.7_
  - _Boundary: Comprehensive Insurance Service_

- [x] 9.2 加入・編集 UI と詳細画面サブセクション
  - 加入有無・保険会社・証券番号・加入日・保険開始日・保険終了日・年間保険料・備考の編集フォームを提供する
  - 加入有無を切り替えた際の関連項目の有効／無効化を UI で表現する
  - 観測条件: 加入情報の編集が保存され、未加入に切り替えると請求関連項目が無効化される
  - _Requirements: 8.1, 8.6_

- [x] 9.3 請求済み・入金済みマーク機能と履歴記録
  - 請求済み・入金済みへの状態変更を Server Action で実装し、`comprehensive_insurance_history` 相当に履歴を記録する
  - 「請求済み + 入金済み」確定で当年度サイクル完了 → `nextBillingDate` を翌年に進める
  - 「閲覧専用」役割は当該操作を拒否する
  - 観測条件: 状態変更が DB と履歴の両方に反映され、サイクル完了後に次回請求日が +1 年されている
  - _Requirements: 8.4, 8.5, 8.8_

- [x] 9.4 未請求一覧画面
  - 「次回請求予定日が当日以前」かつ「請求状況が未請求」の利用者を一覧表示する
  - DataTable で利用者名・所属施設・次回請求予定日・年間保険料を表示し、行から請求済みマークへ遷移できる
  - 観測条件: 該当条件のレコードのみが一覧に現れ、状態変更で当該行が消える
  - _Requirements: 8.3_

- [x] 10. 期限アラート機能
- [x] 10.1 期限アラートサービス（view ベース）の実装
  - `v_insurance_alerts` を参照する `listAlerts` を実装し、施設スコープ・bucket・保険種別フィルタを提供する
  - 表示時に毎回 view を再評価する（クエリキャッシュなし）
  - 観測条件: 境界値（0/30/31/90/91 日）で bucket 分類が単体テストでグリーン
  - _Requirements: 9.1, 9.2, 9.5, 9.7_
  - _Boundary: Expiration Alert Service_

- [x] 10.2 アラート対応状況の更新 Server Action
  - `alert_status_updates` への upsert で「未対応／確認済み／連絡済み／更新済み」を更新する
  - 「閲覧専用」は更新不可
  - 観測条件: 状態変更が即時反映され、ダッシュボード件数（タスク 14）も更新される
  - _Requirements: 9.4_

- [x] 10.3 アラート一覧画面と詳細遷移
  - 一覧の各行に利用者名・所属施設・保険種別・有効期限・残り日数・対応状況を表示する
  - 各行から利用者詳細・該当保険編集画面へ 1 クリックで遷移できる導線を実装する
  - 観測条件: アラートの状態変更が一覧で即時反映され、リロード時に残り日数が最新化される
  - _Requirements: 9.3, 9.6, 9.8_

- [x] 11. 外部業者連携キー管理
  - 利用者詳細サブセクションで業者名・業者種別・ユニークキー・備考の追加／編集／削除を実装する
  - 業者種別 6 種（介護請求ソフト・医療機関・保険会社・給食業者・訪問看護・その他）を ENUM 選択肢で提供する
  - 同一 (利用者 × 業者種別 × 業者名) の重複登録を UNIQUE 制約とサービス層で拒否する
  - 一覧画面でユニークキーを既定マスクし、明示的に「表示」操作した場合のみ全文表示する
  - 観測条件: 重複登録が拒否され、マスク／表示切り替えが UI 単位で機能、ログ・PDF・全文検索に値が露出しない
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - _Boundary: External Vendor Service_

- [x] 12. 添付ファイル（家族構成図・室内見取り図）管理
- [x] 12.1 Supabase Storage バケットとバケットポリシー設定
  - 非公開バケット `resident-attachments` を Supabase 側に作成し、`{facility_id}/{resident_id}/{uuid}.{ext}` 階層方針を文書化する
  - バケットポリシーで認証済みリクエストのみ Get / Upload / Delete 可能とする（二次防御）
  - 観測条件: バケット作成完了、未認証アクセスが拒否される
  - _Requirements: 11.4_

- [x] 12.2 添付サービス（アップロード・取得・削除）の実装
  - MIME（`image/png|jpeg|application/pdf`）と拡張子の整合性、サイズ上限 10 MB をサーバで検証する
  - `resident_attachments` にメタ情報を保存し、本体は Supabase Storage に置く
  - 利用者削除時に添付もストレージから削除する（タスク 6.7 と統合）
  - 「閲覧専用」はアップロード・差し替え・削除を拒否する
  - 観測条件: アップロード・取得・削除が動作、上限超過・許可外 MIME が拒否される
  - _Requirements: 11.2, 11.3, 11.5, 11.6_
  - _Boundary: Attachment Service_

- [x] 12.3 添付ファイル配信 Route Handler の実装
  - `GET /api/attachments/[id]` で `requirePermission("attachment:read")` を実行し、施設スコープを再検証してからストリームまたは短命署名 URL（60 秒）を返却する
  - `Cache-Control: no-store` を必須付与する
  - 観測条件: 認可済みのみ取得可、施設スコープ外は 403／404、未認証は 401
  - _Requirements: 11.4, 16.7_

- [x] 12.4 添付管理 UI（利用者詳細サブセクション）
  - アップロード・差し替え・削除と現状ファイル種別表示（画像はサムネ・PDF はリンク）を実装する
  - 観測条件: 詳細画面から家族構成図・室内見取り図を保存／差替／削除できる
  - _Requirements: 11.2_

- [x] 13. 利用者基本情報 PDF 出力
- [x] 13.1 Noto Sans JP フォント配置と `Font.register`
  - `public/fonts/NotoSansJP-Regular.ttf` と `NotoSansJP-Bold.ttf` を配置する
  - サーバモジュール起動時 1 回だけ `Font.register` を実行する初期化関数を作る（絶対パス指定）
  - 観測条件: 日本語サンプル PDF を生成して文字化けがないことを目視確認できる
  - _Requirements: 13.5_

- [x] 13.2 利用者基本情報 PDF コンポーネントの定義
  - ヘッダー（利用者名・所属施設・出力日時・出力者）と本文（基本・施設・利用状況・保険 4 種・医療／ケア／緊急連絡先・病歴・備考）を 1 つの PDF 文書として組む
  - 外部業者連携キー・添付ファイル本体は PDF に含めない（露出制御）
  - 観測条件: 任意利用者を入力にして 1 つの PDF が生成できる（バイナリ取得まで確認）
  - _Requirements: 13.1, 13.2, 13.5_
  - _Boundary: PDF Export Service_

- [x] 13.3 PDF 出力 Route Handler の実装
  - `GET /api/residents/[id]/pdf` で認可・施設スコープ・404 隠蔽・PDF レンダリング・監査ログ書き込みを順に実行する
  - レスポンスは `application/pdf`、`Content-Disposition: attachment; filename="resident-{id}-YYYYMMDD.pdf"`、`Cache-Control: no-store`
  - `renderToBuffer` → `new Uint8Array(buffer)` で返す
  - 観測条件: 認可済みでバイナリ取得成功、施設外は 403/404、閲覧専用は 403、生成成功時のみ `audit_logs.pdf_exported` が増える
  - _Requirements: 13.3, 13.4, 13.6, 16.1, 16.7_

- [x] 13.4 PDF 出力ボタンと UI 統合
  - 利用者詳細画面と一覧画面に「PDF 出力」ボタンを配置し、`(管理者|一般職員)` のみ表示する
  - 観測条件: ボタンから PDF がダウンロードでき、閲覧専用にはボタンが現れない
  - _Requirements: 13.4_

- [x] 14. ダッシュボード
  - ログイン直後の初期画面として、利用者数・施設別人数・期限切れ件数・更新予定件数（30 日以内）・未請求保険件数を Server Component で集計表示する
  - 各サマリから詳細一覧へのリンクを提供する
  - 集計中はカードを骨格表示で埋め、画面リロード時に常に最新値を返す
  - 管理者は施設フィルタで全施設または特定施設のサマリへ切り替え可能とする
  - 観測条件: ログイン直後にサマリが表示され、各カードから対応する一覧画面へ遷移できる
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  - _Boundary: Dashboard Service_

- [x] 15. 監査ログ閲覧（admin only）
  - 監査ログ一覧画面を `DataTable` で実装し、期間・種別・操作者・対象 ID で絞り込み可能とする
  - 「管理者」役割のみがアクセスでき、一般職員・閲覧専用は 403
  - 表示には PII を含めず、識別子のみを表示する
  - 観測条件: admin から閲覧可能、staff/viewer は 403、フィルタとページングが機能する
  - _Requirements: 16.5_

## Integration: 横串統合と本番化準備

- [x] 16. 横串統合とセキュリティヘッダ
- [x] 16.1 セキュリティヘッダとキャッシュ抑止の一括設定
  - `next.config.ts` または middleware で `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy: default-src 'self'` ＋ Supabase ドメインを設定する
  - 個人情報を含むレスポンス（業務ルート・PDF・添付）に `Cache-Control: no-store` を必須付与する
  - HTTP→HTTPS の自動リダイレクトを設定する
  - 観測条件: 本番ビルドで上記ヘッダがレスポンスに含まれることを curl 等で確認できる
  - _Requirements: 16.6, 16.7_

- [x] 16.2 ルートページとレイアウト統合
  - 既存 `src/app/page.tsx` を削除または `redirect("/dashboard")` に置き換え、認証 middleware と連携する
  - `src/app/layout.tsx` の `metadata` を `kanri-tool` 向けに更新し、`lang="ja"` に設定する
  - ナビゲーション設定にダッシュボード・利用者・期限アラート・利用者総合保険・未請求一覧・職員管理・施設管理・監査ログを登録する
  - 観測条件: `/` アクセスで未認証なら `/login`、認証済みなら `/dashboard` に遷移する
  - _Requirements: 1.1, 17.1, 18.3_

- [x] 16.3 役割×機能の認可マトリクス統合テスト
  - 全ルートと全 Server Action に対し、admin/staff/viewer の各役割でアクセスした結果（許可 or 拒否）が `authentication.md` のマトリクスと一致することをテーブルテストで検証する
  - 施設スコープ違反（A 施設職員が B 施設データへアクセス）の API・PDF・添付の 3 経路を統合テストで検証する
  - 観測条件: 全テストがグリーン、マトリクスから外れた挙動が検出可能な状態となる
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 13.6, 15.2, 15.3, 15.5_
  - _Depends: 4.2, 12.3, 13.3_

## Validation: 受入確認とリグレッション

- [x] 17. E2E 受入確認
- [x] 17.1 (P) E2E: 管理者→新規職員作成→当該職員ログイン→利用者編集
  - admin でログインし、新規職員を作成、当該職員に施設を割当てる
  - 当該職員でログインし、利用者を編集して成功するまでをエンドツーエンドで確認する
  - 観測条件: 一連のシナリオがブラウザベース E2E で成功する
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 4.1, 5.8_
  - _Boundary: Auth Service, Staff Account Service, Resident Service_

- [x] 17.2 (P) E2E: 一般職員ログイン→利用者検索→詳細→PDF 出力
  - staff でログインし、利用者を検索・詳細表示・PDF をダウンロードするまでを確認する
  - 観測条件: PDF ファイルがダウンロードされ、日本語の文字化けが無いことを目視確認できる
  - _Requirements: 1.1, 6.1, 6.2, 13.1, 13.3_
  - _Boundary: Auth Service, Resident Search Service, PDF Export Service_

- [x] 17.3 (P) E2E: 期限アラート閲覧→「更新済み」→ダッシュボード件数更新
  - staff でログインし、期限アラート一覧から 1 件を「更新済み」に変更する
  - ダッシュボードに戻り、対応件数が減少していることを確認する
  - 観測条件: アラート → ダッシュボードの集計が表示時計算で連動する
  - _Requirements: 9.4, 14.1, 14.5_
  - _Boundary: Expiration Alert Service, Dashboard Service_

- [x] 17.4 性能スモークテスト（ダッシュボード集計と DataTable 初期表示）
  - 利用者 1,000 件規模のテストデータを投入し、ダッシュボード集計が 1 秒以内、利用者一覧の 50 件初期表示が 500 ms 以内であることを開発環境で計測する
  - 期限アラート view が 1,000 件規模で破綻しないことを確認する
  - 観測条件: 計測結果が SLA を満たし、満たさない場合はインデックスかクエリ調整の追加チケットが切られる
  - _Requirements: 6.4, 9.5, 14.5_

## Gap Remediation: 施設横断・ヘッダーフィルタ・ダッシュボード集計

> `gap-analysis.md`（2026-05-24）に基づく実装乖離の修正。design.md「Gap Remediation」節と対応。

- [x] 18.1 管理者施設横断スコープの修正（G1）
  - `getAccessibleFacilityIds` を admin の `requested` 許可に拡張し、`resolveFacilityScope` async ヘルパを `shared/authorization/` に追加する
  - `canViewFacility` で admin の詳細・PDF・添付アクセスを許可する
  - `listAccessibleFacilitiesAction` が admin に全 active 施設を返すことを Vitest で検証する
  - 観測条件: admin が `scope=all` / 未所属施設 ID で一覧・詳細にアクセスでき、staff/viewer の施設外拒否は維持される
  - _Requirements: 15.2, 15.3, 15.5_
  - _Depends: 4.2_

- [x] 18.2 AppHeader 施設フィルタの URL 連動（G2）
  - `FacilityScopeSelect` を追加し、`scope=all` / `facilityId` を URL searchParams で伝播する
  - `(app)/layout.tsx` から admin 施設一覧を `AppHeader` に渡す
  - ダッシュボード・利用者一覧・期限アラート・未請求一覧が `resolveFacilityScope` を参照する
  - 観測条件: ヘッダーで施設を切り替えると同一ページのデータがフィルタされる
  - _Requirements: 9.7, 14.3, 17.3, 18.3_
  - _Depends: 18.1_

- [x] 18.3 ダッシュボード集計のアラート対応状況反映（G3）
  - `getDashboardSummary` のアラート COUNT に `alert_status_updates` JOIN を追加し、`not_handled` のみ集計する
  - Vitest で renewed 更新後に件数が減るロジックを検証する（SQL 断片テスト）
  - 観測条件: タスク 17.3 の E2E シナリオ（更新済み → ダッシュボード件数減少）が成立する
  - _Requirements: 9.4, 14.1, 14.5_
  - _Depends: 18.1_
