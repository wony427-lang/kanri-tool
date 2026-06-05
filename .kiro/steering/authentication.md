# Authentication & Authorization Standards

`kanri-tool` の認証（誰か）と認可（何ができるか）に関するプロジェクト規約。詳細要件は `.kiro/specs/resident-management/requirements.md` の Requirement 1〜4・15・16、技術選定は `.kiro/steering/tech.md` を参照。

## Philosophy

- **明確な分離**: 認証（誰か）と認可（何ができるか）を別レイヤーで設計する
- **既定で安全**: 最小権限・フェイルクローズ・短命セッション
- **個人情報前提**: 個人情報を扱うため、UX より安全側に倒す判断を許容する
- **サーバ強制**: UI 非表示は補助。認可は必ずサーバ側で再判定する

## Authentication

### Method

- **採用**: Supabase Auth（メール + パスワード方式）
- **理由**:
  - パスワードハッシュ化（bcrypt 系）・セッション管理・パスワードリセットメールが標準提供
  - サーバ／クライアントどちらからもセッション検証可能（`@supabase/ssr`）
  - 老人ホーム職員の運用想定（外部 SSO 不要）に合致
- **対象外**: OAuth ソーシャルログイン・マジックリンクは現フェーズでは採用しない（将来検討）

### Flow

```
1) ユーザーがログイン画面で ID（メールアドレス）+ パスワードを送信
2) サーバ（Server Action）で Supabase Auth に検証要求
3) Supabase Auth がセッショントークンを発行
4) サーバが HttpOnly / Secure / SameSite=Lax の Cookie に格納
5) 以降のリクエストは @supabase/ssr のサーバクライアントでセッション再検証
6) 認証必須ルートでは middleware で未認証時にログイン画面へリダイレクト
```

### Session Lifecycle

- **保管**: HttpOnly + Secure + SameSite=Lax の Cookie（JavaScript からアクセス不可）
- **有効期間**:
  - アクセストークン: Supabase 既定（短命）
  - リフレッシュ: Supabase の自動リフレッシュを利用
- **未操作タイムアウト**: 既定 30 分（`SESSION_IDLE_TIMEOUT_MIN`）
  - サーバ側で「最後の操作時刻」を保持し、超過時にセッション破棄
- **手動ログアウト**: 当該セッションを失効させ、ログイン画面へリダイレクト
- **権限変更時**: 当該ユーザーの有効セッションをすべて失効させる（管理者による役割変更・利用停止・パスワードリセット時）

### Lockout

- **しきい値**: 同一ログイン ID で 5 回連続失敗（`LOGIN_LOCK_THRESHOLD`、設定変更可能）
- **ロック時間**: 15 分（`LOGIN_LOCK_DURATION_MIN`、設定変更可能）
- **エラーメッセージ**: ID 存在有無を開示しない（一般化したメッセージ）
- **失敗ログ**: `audit_logs` に記録（試行 ID・IP・日時）

### Password Reset

- **管理者経由**: 管理者画面から「リセット」操作。期限付き再設定 URL をユーザーのメールに送る（Supabase Auth 標準機能）
- **URL 有効期間**: 24 時間（既定）。超過したら失効
- **再設定後の挙動**: URL を即失効、当該アカウントの既存セッションをすべて失効
- **管理者画面に平文パスワードを表示しない**: 仮パスワード方式を採る場合も、画面表示せずメール送付のみ

### Password Policy

- **保管**: 一方向ハッシュ（Supabase Auth に委譲）。アプリ側で平文を一切扱わない
- **強度**: 最小 10 文字、英大文字／英小文字／数字／記号のうち 3 種類以上を含む（Supabase 側で強制）
- **使い回し検知**: 現フェーズでは未実装。将来検討
- **多要素認証 (MFA)**: 現フェーズでは未採用。将来検討

## Authorization

### Permission Model

- **方式**: RBAC（Role-Based Access Control）
- **役割**: `admin`（管理者）／ `staff`（一般職員）／ `viewer`（閲覧専用）
- **保持先**: `staff_accounts.role`（または専用 `staff_account_roles` テーブル。design フェーズで確定）

### Role Matrix

| 機能 | admin | staff | viewer |
|---|:---:|:---:|:---:|
| 利用者の閲覧（自施設） | ○ | ○ | ○ |
| 利用者の閲覧（他施設） | ○（フィルタ切替） | × | × |
| 利用者の登録・編集 | ○ | ○ | × |
| 利用者の削除 | ○ | × | × |
| 保険情報の登録・編集 | ○ | ○ | × |
| 利用者総合保険の請求／入金状態変更 | ○ | ○ | × |
| 添付ファイルのアップロード／差し替え | ○ | ○ | × |
| 外部業者連携キーの登録・編集 | ○ | ○ | × |
| 外部業者連携キーの全文閲覧 | ○ | ○（明示操作時） | × |
| PDF 出力 | ○ | ○ | × |
| 期限アラート閲覧 | ○ | ○ | ○ |
| 期限アラート対応状況の更新 | ○ | ○ | × |
| ダッシュボード閲覧 | ○ | ○ | ○ |
| 職員アカウント管理 | ○ | × | × |
| パスワードリセット（他人） | ○ | × | × |
| 施設マスタの管理 | ○ | × | × |
| 監査ログ閲覧 | ○ | × | × |

### Enforcement Points

1. **Middleware**: 認証必須ルートへの未認証アクセスをログイン画面にリダイレクト
2. **Server Components / Route Handlers / Server Actions**: ロール＋施設スコープを必ず再検証
3. **DB クエリ**: 施設スコープ条件を必ず付与（共通ヘルパで強制）
4. **UI**: ボタン非活性／非表示は UX 改善のみ。セキュリティは依存しない

### Pattern (擬似コード)

```typescript
const session = await getSessionOrRedirect();
requirePermission(session, 'resident:update');
const facilityIds = await getAccessibleFacilityIds(session);

const resident = await prisma.resident.update({
  where: { id, facility_id: { in: facilityIds } },
  data: input,
});
```

### Facility Scope

- 全業務クエリで「閲覧者の所属施設」または「管理者が明示選択した施設」のみを返す
- 共通ヘルパ `getAccessibleFacilityIds(session, options)` を必ず通す
- 未割当ユーザーは全業務データへのアクセスを拒否（Req 15-5）

## Audit

- 認証イベント（成功・失敗・ロック・ログアウト）、認可拒否、利用者 CUD、PDF 出力、職員アカウント変更、パスワードリセット、施設マスタ変更を `audit_logs` に記録
- 詳細仕様は `security.md` および `resident-management` Req 16 を参照

## API-to-API Auth

- 現フェーズでは外部 API 公開なし
- 外部業者連携の「ユニークキー」は外部システム側がアクセスする想定だが、本システムではキーを保管・管理するのみで、API は公開しない

---
_実装パッケージ・関数シグネチャは design フェーズで確定する。本ファイルはポリシーと方針を残す。_
