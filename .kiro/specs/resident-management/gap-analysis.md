# Implementation Gap Analysis

> **Feature**: `resident-management`  
> **分析日**: 2026-05-24  
> **言語**: 日本語（`spec.json.language`）  
> **前提**: 要件は承認済み（`requirements.approved: true`）。本分析は **brownfield**（実装済みコードベース）を対象とする。

---

## エグゼクティブサマリー

- **スコープ**: Req 1–25（業務ドメイン 16 + UI 基盤 9）を、既存コード・Prisma スキーマ・テスト資産と照合した。
- **現状**: 13 ドメイン・20+ 業務画面・全 DB エンティティ・Vitest 24 件・smoke 7 本が存在。`tasks.md` は全タスク完了。**コア CRUD と認可基盤は実装済み**（完成度おおよそ 85–90%）。
- **主要ギャップ**: 管理者の施設横断スコープ（Req 15.3）、AppHeader 施設フィルタのデータ未連動（Req 17.3）、ダッシュボードのアラート対応状況未反映（Req 9.4）、E2E の浅さ、業務ルートの loading/error 境界不足。
- **推奨**: 新規アーキテクチャより **横串統合の修正** を優先。design は既存の Layered + Vertical Slice ハイブリッドを維持し、残ギャップは design 改訂または追加タスクで吸収する。

---

## 1. Current State Investigation

### 1.1 ドメイン・レイヤ構成

| レイヤ | パス | 状態 |
|--------|------|------|
| 業務ドメイン | `src/domains/{auth,staff-accounts,facilities,residents,insurance,medical-care,comprehensive-insurance,expiration-alerts,external-vendors,attachments,pdf-export,dashboard,audit-logs}/` | 13 ドメインすべて存在 |
| 横串認可 | `src/shared/authorization/` | `requirePermission`, `getAccessibleFacilityIds`, policy matrix |
| 横串 UI | `src/shared/ui/` | DataTable, Form, AppShell, PageLayouts, primitives |
| ルーティング | `src/app/(app)/`, `src/app/(auth)/` | 業務 10 機能 + 認証 2 画面 |
| API | `src/app/api/residents/[id]/pdf/`, `src/app/api/attachments/[id]/` | PDF・添付配信 |
| DB | `prisma/schema.prisma` + 6 マイグレーション | 全エンティティ + `v_insurance_alerts` view |

### 1.2 再利用可能アセット

- **認可パターン**: `requirePermission()` → `getAccessibleFacilityIds()` → repository/service クエリ（全ドメインで一貫）
- **CRUD パターン**: zod schema → service → Server Action → `(app)/*/page.tsx`
- **監査**: `src/shared/audit-log/service.ts` の `writeAuditLog()` をトランザクション内 CUD とセット
- **UI 基盤**: `DataTable`, `Form`, `PageLayouts`（List/Detail/Create/Edit）, 5 primitives
- **横串ユーティリティ**: `shared/domain/{age,date,labels,mask}.ts`
- **テスト基盤**: `tests/utils/fakeSession.ts`, `fakeRepository.ts`, authorization matrix テスト

### 1.3 統合面・制約

| 統合 | 実装 | 制約 |
|------|------|------|
| Supabase Auth | `src/shared/supabase/`, `src/domains/auth/` | パスワード・セッションは Supabase 委譲 |
| Supabase Storage | `src/domains/attachments/storage.ts` | バケット `resident-attachments` は手動セットアップ（`docs/supabase/resident-attachments-bucket.md`） |
| Prisma + PostgreSQL | `src/shared/db/prisma.ts` | アプリ層認可が一次防御。RLS は Storage のみ |
| Next.js middleware | `src/middleware.ts` | 認証リダイレクト、idle timeout、セキュリティヘッダ |

### 1.4 命名・レイヤ規約（既存パターン）

- ドメイン: `service.ts`（ビジネスロジック）+ `actions.ts`（Server Actions）+ `schemas.ts`（zod）
- 画面: Server Component `page.tsx` + Client 子コンポーネント（`*Client.tsx`, `*Form.tsx`）
- import: `@/` 絶対パス、`"server-only"` でサーバ境界明示

---

## 2. Requirement-to-Asset Map

凡例: **Implemented** / **Partial** / **Missing** / **Constraint**

| Req | テーマ | Status | 主要アセット | ギャップ |
|-----|--------|--------|-------------|---------|
| 1 | 認証・セッション | Implemented | `middleware.ts`, `domains/auth/service.ts`, `shared/auth/idle-session.ts`, `(auth)/login/*` | 役割別初期画面なし（全員 `/dashboard`） |
| 2 | RBAC | Partial | `shared/authorization/policy.ts`, `service.ts` | 1 アカウント 1 役割のみ（Req 2.1「1 つ以上」未対応） |
| 3 | 職員アカウント | Implemented | `domains/staff-accounts/*`, `(app)/staff-accounts/*` | — |
| 4 | パスワードポリシー | Partial | Supabase Auth + `password-policy.ts` | 再設定後の全セッション失効は `signOut()` のみ。24h 失効は Supabase 設定依存 |
| 5 | 利用者基本情報 | Implemented | `domains/residents/*`, `(app)/residents/*` | — |
| 6 | 検索・一覧 | Partial | `ResidentsListClient.tsx`, `residents/repository.ts` | 既定 pageSize=20（要件 50）。DataTable スケルトンは限定的 |
| 7 | 保険 4 種 | Implemented | `domains/insurance/*`, `ResidentInsuranceSections.tsx` | — |
| 8 | 利用者総合保険 | Partial | `comprehensive-insurance/*`, `unbilled/*` | 専用一覧は未請求のみ。`/comprehensive-insurance` は redirect |
| 9 | 期限アラート | Partial | `expiration-alerts/*`, `InsuranceAlertsClient.tsx`, view SQL | ダッシュボード集計が handle_status 未反映（9.4） |
| 10 | 医療・ケア・緊急連絡先 | Implemented | `medical-care/*`, `ResidentDetailSections.tsx` | — |
| 11 | 補足・添付 | Partial | `attachments/*`, `ResidentAttachmentSection.tsx` | Storage バケット手動セットアップ。ウイルススキャンなし（Research Needed） |
| 12 | 外部業者キー | Implemented | `external-vendors/*`, `shared/domain/mask.ts` | — |
| 13 | PDF 出力 | Implemented | `pdf-export/*`, `api/residents/[id]/pdf/route.ts` | — |
| 14 | ダッシュボード | Partial | `dashboard/service.ts`, `DashboardSummaryCards.tsx` | loading スケルトンなし。施設フィルタは URL パラメータのみ |
| 15 | 施設スコープ | Partial | `getAccessibleFacilityIds()` | **admin の他施設/全施設アクセス未実装**（15.3） |
| 16 | 監査・セキュリティ | Partial | `shared/audit-log/*`, `next.config.ts` | `permission_denied` 自動記録なし。HTTPS リダイレクトは production のみ |
| 17 | アプリシェル | Partial | `AppShell.tsx`, `AppHeader.tsx` | **施設フィルタ UI のみ、データ未連動**（17.3） |
| 18 | ナビゲーション | Partial | `shared/nav/navigation.ts` | `permission` フィールド未使用（`roles` のみ） |
| 19 | DataTable | Implemented | `shared/ui/data-table/DataTable.tsx` | — |
| 20 | Form | Implemented | `shared/ui/form/*` | — |
| 21 | UI プリミティブ | Implemented | `shared/ui/primitives/*` | — |
| 22 | デザイントークン | Implemented | `globals.css`, `tests/ui/design-tokens.test.tsx` | — |
| 23 | ページレイアウト | Implemented | `shared/ui/layouts/PageLayouts.tsx` | — |
| 24 | loading/error 境界 | Partial | `BoundaryLoading.tsx`, `BoundaryError.tsx` | `(app)/dev/boundary` のみ。業務ルートに未配置 |
| 25 | アクセシビリティ | Partial | primitives focus trap, Navigation aria | 全画面 h1 規約・体系的 a11y テストは限定的 |

---

## 3. Major Gaps（優先度順）

### G1: 管理者施設横断スコープ（Req 15.3, 14.3, 9.7）— **High**

**現状**: `getAccessibleFacilityIds()` は常に `session.facilityIds`（所属施設）のみ返す。admin でも未所属施設はアクセス不可。

```45:68:src/shared/authorization/service.ts
export function getAccessibleFacilityIds(
  session: SessionContext,
  requested?: ReadonlyArray<string>,
): ReadonlyArray<string> {
  assertActive(session);
  // ... session.facilityIds のみを返す。admin 特権分岐なし
}
```

**影響**: 複数施設を管理する admin が全施設データを参照できない。`authentication.md` Role Matrix「他施設（フィルタ切替）」と不一致。

### G2: AppHeader 施設フィルタ未連動（Req 17.3）— **High**

**現状**: `AppHeader.tsx` の `facilityFilter` は client state のみ。ページデータ・URL に反映されず、施設名ではなく UUID 表示。

### G3: ダッシュボード ↔ アラート対応状況（Req 9.4）— **Medium**

**現状**: `getDashboardSummary` は `v_insurance_alerts` を handle_status 無視で COUNT。対応済みアラートも件数に含まれる。

### G4: E2E 深度不足 — **Medium**

**現状**: `e2e/resident-management.spec.ts` は見出し表示程度。CI は `E2E_ENABLED=true` 時のみ opt-in。

### G5: 業務ルート loading/error 境界（Req 24）— **Low–Medium**

**現状**: `(app)/dev/boundary` のみ。`/residents` 等に route-level `loading.tsx`/`error.tsx` なし。

### G6: 細部要件差 — **Low**

| 項目 | 要件 | 現状 |
|------|------|------|
| 検索 pageSize | 50 | 20（`residents/schemas.ts`） |
| 複数役割 | 1 アカウント 1 つ以上 | 1 役割 enum |
| ナビ permission | 設定駆動フィルタ | `roles` のみ |
| permission_denied 監査 | 自動記録 | 未実装 |

---

## 4. Implementation Approach Options

残ギャップ（G1–G6）に対する実装方針の選択肢。

### Option A: 既存コンポーネントの拡張（推奨）

**対象**: G1, G2, G3, G6

| 変更箇所 | 内容 |
|---------|------|
| `getAccessibleFacilityIds()` | admin 時は `requested` が空なら全施設、指定時は全施設からフィルタ |
| `AppHeader.tsx` + `(app)/layout.tsx` | 施設フィルタを URL searchParams / Context で共有 |
| `dashboard/service.ts` | `alert_status_updates` を JOIN し `renewed` 等を除外 |
| `residents/schemas.ts` | `pageSize` 既定を 50 に変更 |

**Trade-offs**:
- ✅ 既存パターンを維持。変更ファイル数が少ない
- ✅ レビュー・テスト追加が局所的
- ❌ `getAccessibleFacilityIds` の責務がやや増加

### Option B: 新コンポーネント作成

**対象**: G2（施設スコープ Context）、G5（業務用 Boundary ラッパ）

| 新規 | 内容 |
|------|------|
| `FacilityScopeProvider` | ヘッダーフィルタ ↔ 全ページデータの橋渡し |
| `(app)/residents/loading.tsx` 等 | 業務ルートごとの loading/error |

**Trade-offs**:
- ✅ 関心分離が明確
- ✅ フェーズ 2 以降の施設フィルタ再利用に有利
- ❌ ファイル数増加。既存ページへの Provider 配線が必要

### Option C: ハイブリッド（A + B の段階導入）

**Phase 1（S）**: Option A で G1, G3, G6 を修正  
**Phase 2（S）**: Option B で `FacilityScopeProvider` + AppHeader 連動（G2）  
**Phase 3（M）**: 業務ルート loading/error（G5）、E2E 拡充（G4）

**Trade-offs**:
- ✅ リスクを段階的に低減
- ✅ blocker（G1）を最優先で解消
- ❌ 計画・調整コストがやや増加

---

## 5. Effort & Risk Assessment

| ギャップ | Effort | Risk | 根拠 |
|---------|--------|------|------|
| G1 施設横断 | **S** (1–2 日) | **High**（未修正は本番 blocker） | 既存ヘルパ 1 関数 + テスト追加。パターンは確立済み |
| G2 ヘッダーフィルタ | **M** (3–5 日) | **Medium** | URL/Context 設計と全一覧画面への配線 |
| G3 ダッシュボード集計 | **S** (1 日) | **Low** | SQL JOIN 追加のみ |
| G4 E2E 拡充 | **M** (3–5 日) | **Medium** | テストデータ seed・認証フロー整備が必要 |
| G5 loading/error | **S** (1–2 日) | **Low** | 既存 Boundary コンポーネントの再利用 |
| G6 細部差分 | **S** (< 1 日) | **Low** | 定数変更・小さな追記 |

**全体残作業**: **M**（3–7 日）— 新規ドメイン追加ではなく横串統合・ポリッシュ

---

## 6. Research Needed（design フェーズへ引き継ぎ）

| 項目 | 理由 |
|------|------|
| admin 全施設アクセス時の性能 | 施設数・利用者数増加時の `getAccessibleFacilityIds` クエリ最適化 |
| 添付ファイルウイルススキャン | Req 11 は MIME/サイズ検証のみ。ClamAV 等の将来連携 |
| Supabase パスワードリセット URL 失効 | 24h 失効が Supabase プロジェクト設定で保証されているかの運用確認 |
| E2E テストデータ戦略 | CI での Supabase + DB seed 方式（service role vs test fixture） |

---

## 7. Design Phase Recommendations

### 推奨アプローチ

**Option C（ハイブリッド段階導入）** を推奨。理由:

1. G1 は `authentication.md` Role Matrix と直接矛盾し、**本番運用 blocker**
2. G2 は G1 修正後に施設 ID リストが admin で拡張される前提で実装すべき
3. UI 基盤・ドメイン CRUD は確立済みのため、新アーキテクチャは不要

### 主要 design 判断（未確定）

1. **施設フィルタの伝播方式**: URL searchParams（`?facility=uuid`）vs React Context vs cookie
2. **admin 全施設の定義**: DB 全 `facilities` vs admin 所属 + 明示付与
3. **ダッシュボードアラート件数**: `renewed` / `confirmed` を除外する bucket 別ルール

### 既存 design との関係

- `design.md` / `tasks.md` は全完了だが、上記 G1–G3 は **design 記述と実装の乖離** として追加タスク化を推奨
- `research.md` の「グリーンフィールド」記述は **陳腐化**。本 gap-analysis を brownfield の正とする

---

## 8. Gap Review Decision（2026-05-24）

| ギャップ | Blocker 判定 | 対応 |
|---------|-------------|------|
| **G1 管理者施設横断** | **Yes — 本番 blocker** | タスク 18.1 で修正。複数施設 admin が全施設を参照できない |
| **G2 ヘッダーフィルタ** | **Yes — G1 依存** | タスク 18.2。G1 修正後に URL 連動 |
| **G3 ダッシュボード集計** | **Medium — E2E 17.3 不一致** | タスク 18.3。`not_handled` のみ COUNT |
| G4 E2E 深度 | No（今回スコープ外） | 将来タスク |
| G5 loading/error | No（今回スコープ外） | 将来タスク |
| G6 細部差分 | No（今回スコープ外） | pageSize 等は別途 |

---

## 9. Complexity Signals

| 領域 | 複雑度 | 根拠 |
|------|--------|------|
| 認証・RBAC | 中 | Supabase + アプリ層二層。パターン確立済み |
| 利用者 CRUD + 保険 | 低–中 | 標準 CRUD + zod バリデーション |
| 期限アラート | 中 | SQL view + raw query + 対応状況 upsert |
| PDF / 添付 | 中 | 外部 Storage + Route Handler 認可 |
| 施設スコープ横串 | **中–高** | 全ドメインに波及。G1 修正は横断影響 |
| UI 基盤 | 低 | 再利用コンポーネント完成 |

---

## References

- 要件: `.kiro/specs/resident-management/requirements.md`
- 既存 design: `.kiro/specs/resident-management/design.md`
- タスク進捗: `.kiro/specs/resident-management/tasks.md`（全完了）
- 初期調査（グリーンフィールド）: `.kiro/specs/resident-management/research.md`
- Steering: `.kiro/steering/{authentication,security,database,tech,structure}.md`
