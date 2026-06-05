# Security Standards

`kanri-tool` のセキュリティ姿勢（入力検証・認可・秘密情報・PII・ログ・転送）に関するプロジェクト規約。老人ホーム利用者の個人情報を扱うため、運用責任のレベルで規約を定める。詳細要件は `.kiro/specs/resident-management/requirements.md` の Requirement 1〜4・15・16、認証認可は `authentication.md`、DB 規約は `database.md` を参照。

## Philosophy

- **多層防御 (Defense in depth)**: 1 層が破られても次の層で食い止める設計
- **最小権限 (Least privilege)**: 必要最小限の権限のみを付与
- **既定で安全 (Secure by default)**: 安全側にデフォルトを倒す。明示的な解除のみ許容
- **フェイルクローズ**: エラー時・例外時はアクセスを拒否する
- **境界で検証**: API / Server Action / UI フォームの入口で必ず検証
- **個人情報前提**: PII を最小限で扱い、ログ・PDF・キャッシュへの不要露出を抑止

## Input & Output

### Validation

- **検証層**: UI フォーム・Server Action 入口・API ハンドラ・DB 制約の **4 層で重ねる**
- **スキーマライブラリ**: `zod` を既定（Server Action 入力・API 入力・フォーム値を同一スキーマで検証）
- **数値項目**: 桁数・形式（保険者番号、被保険者番号、負担者番号、受給者番号）は規定形式に従って検証
- **日付**: 開始日 ≤ 終了日、利用状況「退去済み」時は退去日必須など、業務制約は明示的に検証
- **アロウリスト**: 入力値は許可値ホワイトリスト方式を優先。ブラックリストは補助
- **早期失敗**: バリデーションエラーは最小限の情報のみ返す（システム内部情報を漏らさない）

### Sanitization

- **出力先別エスケープ**:
  - HTML レンダリング: React の既定エスケープを信頼。`dangerouslySetInnerHTML` は禁止（必要時のみ厳密にレビュー）
  - SQL: Prisma パラメタライズドクエリのみ。生 SQL を組み立てない
  - ログ: PII を含む文字列は記録前にマスク／ハッシュ化
  - ファイル: アップロード時に MIME・サイズ・拡張子を検証

## Authentication & Authorization

- 詳細は `authentication.md` を参照
- **必ずサーバ側で実施**: Server Components / Route Handlers / Server Actions で認可を再確認
- **施設スコープ**: 全業務クエリで強制（`database.md` 参照）

## Secrets & Configuration

- **コミット禁止**: `.env*`（`.env.example` を除く）は `.gitignore` に明記
- **保管**: 本番は Vercel／Supabase の環境変数機能、または専用シークレットマネージャ
- **必須環境変数の検証**: 起動時に必須環境変数の存在を検証し、未設定時はサーバを起動させない（fail-fast）
- **`SUPABASE_SERVICE_ROLE_KEY`**: サーバ専用。クライアントバンドルに含めない。ログにも出力しない
- **ローテーション**: 漏洩・退職時・年次でローテーション

## Sensitive Data (PII / 保険情報 / 外部業者キー)

### Minimization

- 必要最小限の項目のみ収集・保管
- 不要になった項目は速やかに削除する規約とする
- 開発・検証環境では本番データを使わない（ダミーデータを利用）

### Masking & Redaction

- **ログ**: 利用者氏名・住所・電話番号・保険番号・パスワード・トークンを記録しない
- **エラー画面**: スタックトレースと PII を本番ユーザー画面に表示しない（`resident-management` Req 16-4・24-5）
- **画面表示**:
  - 外部業者連携キーは一覧で既定マスク（Req 12-4）
  - 監査ログは管理者のみ閲覧可能（Req 16-5）
- **PDF 出力**: 出力は認可済みリクエストに対してのみ。直接公開 URL を持たせない（Req 11-4・13）

### Encryption

- **転送中**: HTTPS 必須。HTTP は 301 で HTTPS にリダイレクト（Req 16-6）
- **静止時**: Supabase Postgres / Storage の保存時暗号化に依存
- **追加の列暗号化**: 現フェーズでは導入しない。将来、業務要件と監査要件に応じて検討

### Access Control on Storage

- 添付ファイル（家族構成図／室内見取り図）は **直接公開 URL を持たせない**
- ファイル取得は認証済みリクエストから Server / Route Handler 経由で取得
- 利用者削除時は紐づくファイルもストレージから削除する（Req 11-5）

## Session / Token Security

- HttpOnly + Secure + SameSite=Lax の Cookie（`authentication.md` 参照）
- 短命アクセストークン + 自動リフレッシュ
- 権限変更・パスワードリセット時に既存セッションを失効
- 30 分未操作で自動ログアウト（既定）

## Logging (Security-Aware)

### Audit Log

- **対象イベント**:
  - 認証成功・失敗・ロック・ログアウト
  - 認可拒否
  - 利用者情報の作成・更新・削除
  - PDF 出力
  - 職員アカウント変更
  - パスワードリセット
  - 施設マスタ変更
- **記録項目**: 操作者 ID・操作日時・操作種別・対象 ID（利用者／アカウント／施設）・操作元 IP アドレス・リクエスト ID
- **記録しない**: 平文パスワード・保険のフル番号・外部業者連携ユニークキー・添付ファイル本体・トークン
- **閲覧権限**: 管理者ロールのみ

### Application Log

- リクエスト ID を付与し、認証イベント／例外／重要な業務イベントを相関できるようにする
- PII は記録しない／マスク済みで記録する
- 本番ログ転送先に PII が出ないことを定期的に確認する

## Headers & Transport

- **HTTPS / HSTS**: 本番は必須。`Strict-Transport-Security: max-age=31536000; includeSubDomains` を付与
- **CSP**: `default-src 'self'` を基準に、Supabase ドメイン等の必要な接続先のみ許可
- **その他セキュリティヘッダ**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`（または CSP `frame-ancestors 'none'`）
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`: 不要な機能（camera, microphone, geolocation 等）を無効化
- **キャッシュ抑止**: 個人情報を含むレスポンスに `Cache-Control: no-store` を付与（Req 16-7）

## File Upload

- **対象**: 家族構成図・室内見取り図など
- **検証**:
  - MIME（`image/png`, `image/jpeg`, `application/pdf`）をホワイトリストで限定
  - 拡張子と MIME の整合性チェック
  - サイズ上限 10 MB（既定）
  - 画像はサーバ側で再エンコードして実行可能形式やメタデータ漏洩を防ぐことを検討
- **保管**: Supabase Storage の非公開バケットに `facility_id / resident_id / uuid` 階層で配置
- **取得**: 認可済みリクエストからサーバ経由で署名 URL を発行 or バイナリ転送

## CSRF / XSS / SSRF

- **CSRF**: SameSite=Lax Cookie + Server Action の暗黙的トークン保護を基本とする。クロスサイト書込みは設計上発生させない
- **XSS**: React 既定エスケープに依存し、`dangerouslySetInnerHTML` 禁止。出力先別エスケープを徹底
- **SSRF**: 外部 URL を取りに行く機能は本フェーズでは持たないため考慮不要。将来追加時はホワイトリスト方式で限定

## Vulnerability Posture

- **依存性管理**: `npm audit` を CI に組み込み、High 以上は速やかに対応
- **アップデート**: フレームワーク（Next.js / React / Prisma）のセキュリティアップデートを優先適用
- **静的解析**: ESLint のセキュリティ系ルール（または `eslint-plugin-security` 等）の導入を検討
- **シークレットスキャン**: コミット前フックまたは CI でシークレット漏洩スキャンを実行

## Incident Response (運用フェーズ)

- 個人情報漏洩疑い時の初動手順を別途運用ドキュメントで定義する（本ファイルは設計規約の範囲）
- 監査ログから事象範囲を特定できる状態を維持する

---
_本ファイルは「設計判断とルール」を残す。具体的なツール・コマンド・閾値はインフラ／運用ドキュメント側で詳細化する。_
