# Database Standards

`kanri-tool`（老人ホーム利用者管理システム）のスキーマ設計・クエリ・マイグレーション・整合性に関するプロジェクト規約。詳細な要件は `.kiro/specs/resident-management/requirements.md`、技術選定は `.kiro/steering/tech.md` を参照する。

## Philosophy

- **ドメイン優先**: 利用者・施設・保険・職員などの業務エンティティを正確に表現してから、性能チューニングする
- **DB に整合性を寄せる**: アプリケーション層と DB の二重防御。NOT NULL / UNIQUE / CHECK / FK で不変条件を明示する
- **必要な列だけ読む**: 個人情報を扱うため、不必要な列のフェッチを避ける
- **マルチテナントではなく施設スコープ**: テナント分離ではなく `facility_id` カラムによる行レベルのスコープ制御を行う

## Stack

- **DB**: PostgreSQL（Supabase 提供）
- **ORM**: Prisma（`prisma/schema.prisma` を単一の真実とする）
- **マイグレーション**: `prisma migrate dev` でローカル開発、`prisma migrate deploy` で本番反映
- **接続**: 通常クエリは `DATABASE_URL`（プーラ経由）、マイグレーションは `DIRECT_URL`（直接接続）

## Naming & Types

- **テーブル**: `snake_case`・複数形（`residents`, `staff_accounts`, `insurance_records`）
- **カラム**: `snake_case`（`created_at`, `facility_id`, `move_out_date`）
- **主キー**: `id`（`uuid` を既定。`gen_random_uuid()` または `uuid_generate_v4()`）
- **外部キー**: `{table_singular}_id`（`facility_id` → `facilities.id`）
- **タイムスタンプ**: `timestamptz` を必須。`created_at` / `updated_at` をすべての業務テーブルに持つ
- **金額**: `numeric(12, 0)`（円・整数）または `numeric(12, 2)`（小数を扱う場合）。`float` / `double precision` は禁止
- **列挙値**（利用状況・役割・業者種別 等）: PostgreSQL `ENUM` または `CHECK` 制約付き `text`。Prisma の `enum` と整合させる
- **ブール**: `is_active`, `is_archived` のように肯定形で命名

## Schema Conventions

- すべての業務テーブルに次の列を持つ
  - `id` UUID PK
  - `created_at` / `updated_at`（`timestamptz`、`now()` 既定）
  - `created_by` / `updated_by`（`staff_accounts.id`、論理 FK）
- **論理削除**: 既定では行わない。やむを得ない場合のみ `deleted_at timestamptz` を導入し、すべての一覧クエリで `WHERE deleted_at IS NULL` を必須化する
- **施設スコープ**: 利用者・職員・保険・添付ファイル・監査ログ等、施設に紐づくすべてのテーブルに `facility_id` を保持する
- **添付ファイル**: バイナリ本体は Supabase Storage に置き、DB には `storage_path`・`mime_type`・`byte_size`・`uploaded_at` のメタ情報のみを保持する

## Relationships

- **1:N**: 子テーブル側に FK（例: `residents.facility_id` → `facilities.id`）
- **N:N**: 連結テーブル（例: 将来の `resident_caregivers`）に複合主キーを設定
- **1:1**: 子テーブルに FK + UNIQUE
- **利用者と保険**: 介護保険・医療保険は 1 利用者 1 件（必要に応じて履歴テーブル）。公費は 1:N（`public_expense_records`）

## Migrations

- **不変**: 既存マイグレーションは編集しない。誤りは「打ち消しマイグレーション」を追加する
- **小さく刻む**: 1 マイグレーションで 1 つの目的のみ
- **命名**: `{seq}_{action}_{object}` 例: `20260524_001_create_residents`
- **ロールバック方針**: 破壊的変更は段階的に行う（追加→アプリ側切替→旧列削除）
- **PII 列追加時**: マイグレーションコメントで「個人情報を含む」旨を明記する

## Query Patterns

- **既定は Prisma**: 型安全と保守性のため、CRUD は Prisma で書く
- **複雑／性能要件のあるクエリ**: Prisma の `$queryRaw` または読み取り専用 view を作成
- **N+1 回避**: `include` / `select` で必要なリレーションをまとめて取得。リスト系クエリは必ずチェック
- **ページング**: 件数の多い一覧（利用者・期限アラート・監査ログ）は必ず offset/limit またはカーソルページングを実装
- **検索**: 氏名・フリガナの部分一致は ILIKE または `pg_trgm` のインデックスを検討
- **施設スコープ**: すべてのドメインクエリで `facility_id IN (...許可された施設...)` を必須とし、共通ヘルパで強制する

## Connection & Transactions

- **接続プール**: Supabase の Pooler を介する（`DATABASE_URL`）。アプリ側で長時間接続を保持しない
- **トランザクション**: 複数テーブル更新（例: 利用者更新と監査ログ記録）は `prisma.$transaction` で囲む
- **アイソレーション**: 既定 `Read Committed`。集計処理など整合性が必要な場合のみ昇格を検討
- **タイムアウト**: 長時間ロックは禁止。バッチ処理は読み取り専用 view またはレポート DB を別途用意することを検討

## Data Integrity

- **必須項目**: NOT NULL 制約。アプリ側のバリデーション（zod 等）とニ重化する
- **一意制約**: ログイン ID・メールアドレス・（利用者×業者種別×業者名）等は DB UNIQUE で強制
- **FK**: ON DELETE は基本 `RESTRICT`。利用者の削除に伴う添付削除など、業務上カスケードが妥当なものだけ `CASCADE` を選択し、明記する
- **CHECK 制約**: 利用状況の値域、保険期間の `end >= start` 等、明示的にチェック
- **派生列**: 年齢など毎回計算する値は保存せず、ビューまたはアプリ層で算出する

## PII / Audit

- **個人情報を含むテーブル**: `residents` / `emergency_contacts` / `staff_accounts` / `insurance_records` / `audit_logs` 等
- **マスキング**: 開発／検証環境にはダミーデータを使い、本番データは複製しない
- **監査ログ**: 認証・利用者 CUD・PDF 出力・アカウント変更・パスワードリセット・施設マスタ変更を `audit_logs` に保存（`security.md` の規定に従う）
- **秘匿値の非保存**: 平文パスワード・保険のフル番号・外部業者ユニークキーは監査ログに保存しない
- **アクセスログ**: 監査ログは管理者のみ閲覧可能とする（Req 16-5）

## Backup & Recovery

- Supabase の自動バックアップを基本とし、定期的に**リストア検証**を行う
- 重要マイグレーション前にスナップショットを取得する
- RPO / RTO の数値目標は運用フェーズで合意し、本ファイルに追記する

## Row Level Security (RLS)

- **第一防御線はアプリケーション層**: 認可・施設スコープはサーバ側で必ず実施
- **二次防御として RLS を検討**: Supabase Auth 経由でクライアントから直接 DB アクセスする箇所には RLS を必須化する
- **Prisma 経由のサーバアクセス**: `SUPABASE_SERVICE_ROLE_KEY` 相当（または専用 DB ロール）で RLS をバイパスし、代わりにアプリ層で施設スコープを必ず適用する
- **方針確定**: 最終的な RLS 採用範囲は `resident-management` の design フェーズで決める

---
_スキーマの具体（カラム一覧・インデックス）は design フェーズで `prisma/schema.prisma` として確定する。本ファイルは「設計判断と規約」を残す。_
